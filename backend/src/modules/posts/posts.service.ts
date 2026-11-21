import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { literal, Op, type Order, type WhereOptions } from 'sequelize';

import { AppException } from '../../common/errors';
import type {
  AuthUser,
  RequestLanguage,
} from '../../common/types/request-context';
import { paginate, type Paginated } from '../../common/utils/paginate';
import { CacheTtl, RedisKeys } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { RedisService } from '../../infra/redis/redis.service';

import { CategoryTranslation } from '../categories/models/category-translation.model';
import { canModeratePostComments } from '../comments/comment-permissions';
import { Comment } from '../comments/models/comment.model';
import { LanguagesService } from '../languages/languages.service';
import { User } from '../users/models/user.model';

import type { PublicPostDetailDto } from './dto/public-post-detail-response.dto';
import type { PublicPostCardDto } from './dto/public-post-response.dto';
import { Post } from './models/post.model';
import { PostTranslation } from './models/post-translation.model';

export interface PostCardQuery {
  limit: number;
  offset: number;
  order: Order;
  /** Chỉ lấy bài thuộc danh mục này (UC07) */
  categoryId?: number;
  /** Bỏ bài này ra khỏi kết quả (bài cùng danh mục, UC06) */
  excludePostId?: number;
  /**
   * Biểu thức đã qua `toBooleanSearchTerm`, lọc bằng FULLTEXT (UC19). Truyền
   * vào SQL bằng replacement `:search`, nên `order` dùng được `SEARCH_ORDER`.
   */
  search?: string;
}

/** Kết quả trước khi gọi paginate(), để cache được bằng JSON */
export interface PostCardPage {
  items: PublicPostCardDto[];
  total: number;
}

const WORDS_PER_MINUTE = 200;

/** Số bài cùng danh mục ở trang chi tiết (phase 3 doc mục 4.2) */
export const RELATED_LIMIT = 4;

const POST_NOT_FOUND = 'Không tìm thấy bài viết';

/** Mới nhất trước; `id` để thứ tự ổn định khi trùng thời điểm đăng */
export const LATEST_ORDER: Order = [
  ['publishedAt', 'DESC'],
  ['id', 'DESC'],
];

/**
 * Điểm liên quan của FULLTEXT `ft_post_translations_search` (parser ngram).
 * Danh sách cột phải trùng đúng thứ tự cột của index thì MySQL mới dùng index.
 */
const SEARCH_MATCH =
  'MATCH (`PostTranslation`.`title`, `PostTranslation`.`excerpt`, `PostTranslation`.`content`) AGAINST (:search IN BOOLEAN MODE)';

/** Liên quan nhất trước; trùng điểm thì mới nhất trước */
const SEARCH_ORDER: Order = [
  [literal(SEARCH_MATCH), 'DESC'],
  ...(LATEST_ORDER as [string, string][]),
];

/**
 * Mọi ký tự không phải chữ (kể cả dấu tổ hợp) hoặc số là chỗ tách từ. Toán tử
 * của BOOLEAN MODE (`+ - < > ( ) ~ * " @`) cũng bị bỏ ở bước này.
 */
const WORD_SEPARATOR = /[^\p{L}\p{M}\p{N}]+/u;

/** Bằng `ngram_token_size`: từ ngắn hơn không có token nào trong index */
const MIN_WORD_LENGTH = 2;

/**
 * Từ khóa người dùng gõ thành biểu thức cho `AGAINST (... IN BOOLEAN MODE)`:
 * mỗi từ từ 2 ký tự trở lên thêm `+` để kết quả phải chứa đủ mọi từ, từ 1 ký tự
 * bị bỏ vì không bao giờ khớp. Trả chuỗi rỗng nếu không còn từ nào để tìm.
 */
export function toBooleanSearchTerm(keyword: string): string {
  return keyword
    .split(WORD_SEPARATOR)
    .filter((word) => [...word].length >= MIN_WORD_LENGTH)
    .map((word) => `+${word}`)
    .join(' ');
}

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(PostTranslation)
    private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(CategoryTranslation)
    private readonly categoryTranslationModel: typeof CategoryTranslation,
    @InjectModel(Comment)
    private readonly commentModel: typeof Comment,
    private readonly languagesService: LanguagesService,
    private readonly cache: CacheService,
    private readonly redis: RedisService,
  ) {}

  /**
   * GET /posts/:slug (UC06): bản dịch published có slug này ở ngôn ngữ đang chọn.
   * Không cache: lượt xem, số bình luận và `canDeleteComments` khác nhau theo
   * từng lần xem.
   */
  async findBySlug(
    language: RequestLanguage,
    slug: string,
    ip: string,
    viewer?: AuthUser,
  ): Promise<PublicPostDetailDto> {
    const translation = await this.postTranslationModel.findOne({
      where: { slug, languageId: language.id, status: 'published' },
      include: [
        {
          model: Post,
          as: 'post',
          required: true,
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['fullName', 'avatar'],
              required: true,
            },
          ],
        },
      ],
    });
    if (!translation) {
      throw AppException.notFound(POST_NOT_FOUND);
    }
    const post = translation.post!;

    const [counted, categories, commentCount, availableLanguages] =
      await Promise.all([
        this.countView(translation.id, ip),
        this.loadCategoryNames(language, [post.categoryId]),
        this.commentModel.count({
          where: { postTranslationId: translation.id },
        }),
        this.findAvailableLanguages(post.id),
      ]);

    return {
      translationId: translation.id,
      slug: translation.slug,
      title: translation.title,
      excerpt: translation.excerpt ?? null,
      content: translation.content,
      thumbnail: post.thumbnail ?? null,
      category: categories.get(post.categoryId) ?? null,
      author: {
        fullName: post.author?.fullName ?? '',
        avatar: post.author?.avatar ?? null,
      },
      publishedAt: translation.publishedAt
        ? translation.publishedAt.toISOString()
        : null,
      viewCount: Number(translation.viewCount) + (counted ? 1 : 0),
      readingMinutes: calculateReadingMinutes(translation.content),
      commentCount,
      availableLanguages,
      canDeleteComments: canModeratePostComments(viewer, Number(post.userId)),
    };
  }

  /**
   * GET /posts/:slug/related (UC06): tối đa 4 bài cùng danh mục, có bản dịch
   * published ở cùng ngôn ngữ, bỏ bài đang xem, mới nhất trước.
   */
  async findRelated(
    language: RequestLanguage,
    slug: string,
  ): Promise<PublicPostCardDto[]> {
    const translation = await this.postTranslationModel.findOne({
      where: { slug, languageId: language.id, status: 'published' },
      attributes: ['id', 'postId'],
      include: [
        {
          model: Post,
          as: 'post',
          required: true,
          attributes: ['id', 'categoryId'],
        },
      ],
    });
    if (!translation) {
      throw AppException.notFound(POST_NOT_FOUND);
    }

    const { items } = await this.findCards(language, {
      limit: RELATED_LIMIT,
      offset: 0,
      order: LATEST_ORDER,
      categoryId: translation.post!.categoryId,
      excludePostId: translation.post!.id,
    });
    return items;
  }

  /**
   * Tăng lượt xem của bản dịch, mỗi IP một lần trong 1 giờ (phase 3 doc mục 3.5).
   * `SET NX` để hai request cùng lúc từ một IP chỉ tính một lần.
   * Trả true nếu lần xem này được tính.
   */
  private async countView(translationId: number, ip: string): Promise<boolean> {
    const result = await this.redis.client.set(
      RedisKeys.view(translationId, ip),
      '1',
      'EX',
      CacheTtl.view,
      'NX',
    );
    if (result !== 'OK') return false;

    // Không xóa cache: lượt xem trên thẻ bài được phép trễ tối đa 5 phút
    await this.postTranslationModel.increment('viewCount', {
      by: 1,
      where: { id: translationId },
    });
    return true;
  }

  /** Ngôn ngữ đang hoạt động có bản dịch published của bài, theo thứ tự của findActive() */
  private async findAvailableLanguages(
    postId: number,
  ): Promise<PublicPostDetailDto['availableLanguages']> {
    const languages = await this.languagesService.findActive();
    const translations = await this.postTranslationModel.findAll({
      where: {
        postId,
        status: 'published',
        languageId: { [Op.in]: languages.map((item) => item.id) },
      },
      attributes: ['languageId', 'slug'],
    });
    const slugs = new Map(
      translations.map((item) => [item.languageId, item.slug]),
    );
    return languages
      .filter((item) => slugs.has(item.id))
      .map((item) => ({
        code: item.code,
        name: item.name,
        slug: slugs.get(item.id)!,
      }));
  }

  /** GET /posts (UC05): bản dịch published ở ngôn ngữ đang chọn, mới nhất trước */
  async findAll(
    language: RequestLanguage,
    page = 1,
    limit = 10,
  ): Promise<Paginated<PublicPostCardDto>> {
    // Cache kết quả thô rồi mới paginate(): Symbol đánh dấu phân trang
    // của paginate() không giữ được qua JSON trong Redis
    const { items, total } = await this.cache.wrap(
      RedisKeys.postsList(language.code, page, limit),
      CacheTtl.posts,
      () =>
        this.findCards(language, {
          limit,
          offset: (page - 1) * limit,
          order: LATEST_ORDER,
        }),
    );
    return paginate(items, total, { page, limit });
  }

  /** GET /posts/popular (UC05): theo lượt xem giảm dần */
  findPopular(
    language: RequestLanguage,
    limit = 5,
  ): Promise<PublicPostCardDto[]> {
    return this.cache.wrap(
      RedisKeys.postsPopular(language.code, limit),
      CacheTtl.posts,
      async () => {
        const { items } = await this.findCards(language, {
          limit,
          offset: 0,
          order: [
            ['viewCount', 'DESC'],
            ...(LATEST_ORDER as [string, string][]),
          ],
        });
        return items;
      },
    );
  }

  /**
   * GET /search (UC19): bản dịch published ở ngôn ngữ đang chọn khớp từ khóa
   * trong tiêu đề, tóm tắt, nội dung; liên quan nhất trước. Không cache vì từ
   * khóa quá đa dạng (phase 3 doc mục 3.5 không có key cho tìm kiếm).
   */
  async search(
    language: RequestLanguage,
    keyword: string,
    page = 1,
    limit = 10,
  ): Promise<Paginated<PublicPostCardDto>> {
    const search = toBooleanSearchTerm(keyword);
    if (!search) {
      return paginate([], 0, { page, limit });
    }
    const { items, total } = await this.findCards(language, {
      limit,
      offset: (page - 1) * limit,
      order: SEARCH_ORDER,
      search,
    });
    return paginate(items, total, { page, limit });
  }

  /**
   * Thẻ bài của các bản dịch published ở ngôn ngữ đang chọn. Dùng chung cho
   * trang chủ, sidebar, trang danh mục (C2 gọi với `categoryId`) và tìm kiếm
   * (`search`). Không cache, nơi gọi tự cache theo key của mình.
   */
  async findCards(
    language: RequestLanguage,
    query: PostCardQuery,
  ): Promise<PostCardPage> {
    const postWhere: WhereOptions<Post> = {};
    if (query.categoryId !== undefined) {
      Object.assign(postWhere, { categoryId: query.categoryId });
    }
    if (query.excludePostId !== undefined) {
      Object.assign(postWhere, { id: { [Op.ne]: query.excludePostId } });
    }

    const where: WhereOptions<PostTranslation> = {
      languageId: language.id,
      status: 'published',
    };
    if (query.search !== undefined) {
      Object.assign(where, { [Op.and]: [literal(SEARCH_MATCH)] });
    }

    const { rows, count } = await this.postTranslationModel.findAndCountAll({
      where,
      ...(query.search !== undefined && {
        replacements: { search: query.search },
      }),
      include: [
        {
          model: Post,
          as: 'post',
          required: true,
          where: postWhere,
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['fullName', 'avatar'],
              required: true,
            },
          ],
        },
      ],
      order: query.order,
      limit: query.limit,
      offset: query.offset,
      distinct: true,
    });

    if (rows.length === 0) {
      return { items: [], total: count };
    }

    const categories = await this.loadCategoryNames(
      language,
      rows.map((row) => row.post!.categoryId),
    );

    const items = rows.map((row): PublicPostCardDto => {
      const post = row.post!;
      return {
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt ?? null,
        thumbnail: post.thumbnail ?? null,
        category: categories.get(post.categoryId) ?? null,
        author: {
          fullName: post.author?.fullName ?? '',
          avatar: post.author?.avatar ?? null,
        },
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        viewCount: Number(row.viewCount),
        readingMinutes: calculateReadingMinutes(row.content),
      };
    });

    return { items, total: count };
  }

  /**
   * Tên + slug danh mục ở ngôn ngữ đang chọn, thiếu thì dùng ngôn ngữ mặc định.
   * Một truy vấn cho cả trang, không N+1.
   */
  private async loadCategoryNames(
    language: RequestLanguage,
    categoryIds: number[],
  ): Promise<Map<number, { name: string; slug: string }>> {
    const result = new Map<number, { name: string; slug: string }>();
    const ids = [...new Set(categoryIds)];
    if (ids.length === 0) return result;

    const languageIds = [language.id];
    if (!language.isDefault) {
      const languages = await this.languagesService.findActive();
      const fallback = languages.find((item) => item.isDefault);
      if (fallback) languageIds.push(fallback.id);
    }

    const translations = await this.categoryTranslationModel.findAll({
      where: {
        categoryId: { [Op.in]: ids },
        languageId: { [Op.in]: languageIds },
      },
    });

    // Ngôn ngữ mặc định trước, ngôn ngữ đang chọn ghi đè sau
    const sorted = [...translations].sort(
      (a, b) =>
        Number(a.languageId === language.id) -
        Number(b.languageId === language.id),
    );
    for (const item of sorted) {
      result.set(item.categoryId, { name: item.name, slug: item.slug });
    }
    return result;
  }
}

/** Số chữ trong nội dung đã bỏ thẻ / 200, làm tròn lên, tối thiểu 1 (phase 3 doc mục 4.2) */
export function calculateReadingMinutes(content: string): number {
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' ')
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
