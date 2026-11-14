import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type Order, type WhereOptions } from 'sequelize';

import type { RequestLanguage } from '../../common/types/request-context';
import { paginate, type Paginated } from '../../common/utils/paginate';
import { CacheTtl, RedisKeys } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';

import { CategoryTranslation } from '../categories/models/category-translation.model';
import { LanguagesService } from '../languages/languages.service';
import { User } from '../users/models/user.model';

import type { PublicPostCardDto } from './dto/public-post-response.dto';
import { Post } from './models/post.model';
import { PostTranslation } from './models/post-translation.model';

export interface PostCardQuery {
  limit: number;
  offset: number;
  order: Order;
  /** Chỉ lấy bài thuộc danh mục này (UC07) */
  categoryId?: number;
}

/** Kết quả trước khi gọi paginate(), để cache được bằng JSON */
export interface PostCardPage {
  items: PublicPostCardDto[];
  total: number;
}

const WORDS_PER_MINUTE = 200;

/** Mới nhất trước; `id` để thứ tự ổn định khi trùng thời điểm đăng */
export const LATEST_ORDER: Order = [
  ['publishedAt', 'DESC'],
  ['id', 'DESC'],
];

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(PostTranslation)
    private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(CategoryTranslation)
    private readonly categoryTranslationModel: typeof CategoryTranslation,
    private readonly languagesService: LanguagesService,
    private readonly cache: CacheService,
  ) {}

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
   * Thẻ bài của các bản dịch published ở ngôn ngữ đang chọn. Dùng chung cho
   * trang chủ, sidebar và trang danh mục (C2 gọi với `categoryId`). Không cache,
   * nơi gọi tự cache theo key của mình.
   */
  async findCards(
    language: RequestLanguage,
    query: PostCardQuery,
  ): Promise<PostCardPage> {
    const postWhere: WhereOptions<Post> =
      query.categoryId === undefined ? {} : { categoryId: query.categoryId };

    const { rows, count } = await this.postTranslationModel.findAndCountAll({
      where: { languageId: language.id, status: 'published' },
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
