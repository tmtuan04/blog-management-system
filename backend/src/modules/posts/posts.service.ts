import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type Order } from 'sequelize';

import type { RequestLanguage } from '../../common/types/request-context';
import { paginate, type Paginated } from '../../common/utils/paginate';
import { CacheService } from '../../infra/redis/cache.service';

import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Language } from '../languages/models/language.model';
import { User } from '../users/models/user.model';

import { Post } from './models/post.model';
import { PostTranslation } from './models/post-translation.model';

// ============================================
// 1. KIỂU DỮ LIỆU TRẢ VỀ CHO TRANG CHỦ
// ============================================

export interface PublicPostCard {
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail: string | null;

  category: {
    name: string;
    slug: string;
  } | null;

  author: {
    fullName: string;
    avatar: string | null;
  };

  publishedAt: string | null;
  viewCount: number;
  readingMinutes: number;
}

// Dùng kiểu phân trang chung của dự án
export type PaginatedPostsResult = Paginated<PublicPostCard>;

// Kiểu dữ liệu trung gian trước khi gọi paginate()
interface PostCardsResult {
  items: PublicPostCard[];
  total: number;
}

// ============================================
// 2. POSTS SERVICE - UC05
// ============================================

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(PostTranslation)
    private readonly postTranslationModel: typeof PostTranslation,

    @InjectModel(CategoryTranslation)
    private readonly categoryTranslationModel: typeof CategoryTranslation,

    @InjectModel(Language)
    private readonly languageModel: typeof Language,

    private readonly cacheService: CacheService,
  ) {}

  // ============================================
  // 3. TÍNH THỜI GIAN ĐỌC
  // ============================================

  // Quy ước: 200 từ/phút, tối thiểu 1 phút
  private calculateReadingMinutes(content: string): number {
    const text = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' ')
      .trim();

    const wordCount = text ? text.split(/\s+/).length : 0;

    return Math.max(1, Math.ceil(wordCount / 200));
  }

  // ============================================
  // 4. HÀM TRUY VẤN DÙNG CHUNG
  // ============================================

  private async loadPostCards(
    language: RequestLanguage,
    limit: number,
    offset: number,
    order: Order,
  ): Promise<PostCardsResult> {
    // 4.1. Lấy các bản dịch đã xuất bản
    const { rows, count } = await this.postTranslationModel.findAndCountAll({
      where: {
        languageId: language.id,
        status: 'published',
      },

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

      order,
      limit,
      offset,
      distinct: true,
    });

    // Không có bài viết phù hợp
    if (rows.length === 0) {
      return {
        items: [],
        total: count,
      };
    }

    // ============================================
    // 4.2. Xác định ngôn ngữ mặc định
    // ============================================

    let defaultLanguageId = language.id;

    if (!language.isDefault) {
      const defaultLanguage = await this.languageModel.findOne({
        where: {
          isDefault: true,
        },
      });

      defaultLanguageId = defaultLanguage?.id ?? language.id;
    }

    // ============================================
    // 4.3. Lấy danh sách categoryId
    // ============================================

    const categoryIds = [
      ...new Set(
        rows
          .map((translation) => translation.post?.categoryId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];

    // Map dùng để lưu tên và slug danh mục
    const categoryMap = new Map<
      number,
      {
        name: string;
        slug: string;
      }
    >();

    // ============================================
    // 4.4. Lấy bản dịch danh mục
    // ============================================

    if (categoryIds.length > 0) {
      const categoryTranslations = await this.categoryTranslationModel.findAll({
        where: {
          categoryId: {
            [Op.in]: categoryIds,
          },

          languageId: {
            [Op.in]: [language.id, defaultLanguageId],
          },
        },
      });

      // Lưu bản dịch của ngôn ngữ mặc định trước
      for (const category of categoryTranslations) {
        if (category.languageId === defaultLanguageId) {
          categoryMap.set(category.categoryId, {
            name: category.name,
            slug: category.slug,
          });
        }
      }

      // Ưu tiên bản dịch theo ngôn ngữ hiện tại
      for (const category of categoryTranslations) {
        if (category.languageId === language.id) {
          categoryMap.set(category.categoryId, {
            name: category.name,
            slug: category.slug,
          });
        }
      }
    }

    // ============================================
    // 4.5. Chuyển dữ liệu thành thẻ bài viết
    // ============================================

    const items: PublicPostCard[] = rows.map((translation) => {
      const post = translation.post!;

      return {
        slug: translation.slug,

        title: translation.title,

        excerpt: translation.excerpt ?? null,

        thumbnail: post.thumbnail ?? null,

        category: categoryMap.get(post.categoryId) ?? null,

        author: {
          fullName: post.author?.fullName ?? '',

          avatar: post.author?.avatar ?? null,
        },

        publishedAt:
          translation.publishedAt instanceof Date
            ? translation.publishedAt.toISOString()
            : null,

        viewCount: Number(translation.viewCount),

        readingMinutes: this.calculateReadingMinutes(translation.content),
      };
    });

    return {
      items,
      total: count,
    };
  }

  // ============================================
  // 5. UC05 - GET /api/v1/posts
  // ============================================

  async findAll(
    language: RequestLanguage,
    page = 1,
    limit = 10,
  ): Promise<PaginatedPostsResult> {
    const cacheKey = `cache:posts:list:v2:${language.code}:${page}:${limit}`;

    const offset = (page - 1) * limit;

    // Redis lưu dữ liệu JSON thông thường
    const { items, total } = await this.cacheService.wrap<PostCardsResult>(
      cacheKey,
      300,
      () =>
        this.loadPostCards(language, limit, offset, [
          ['publishedAt', 'DESC'],
          ['id', 'DESC'],
        ]),
    );

    // QUAN TRỌNG:
    // Gọi paginate() SAU khi đọc dữ liệu từ Redis.
    //
    // paginate() thêm Symbol đặc biệt để
    // TransformInterceptor nhận diện phân trang.
    //
    // Nếu paginate() được gọi trước khi cache,
    // Redis JSON sẽ làm mất Symbol đó.

    return paginate(items, total, {
      page,
      limit,
    });
  }

  // ============================================
  // 6. UC05 - GET /api/v1/posts/popular
  // ============================================

  async findPopular(
    language: RequestLanguage,
    limit = 5,
  ): Promise<PublicPostCard[]> {
    const cacheKey = `cache:posts:popular:${language.code}:${limit}`;

    return this.cacheService.wrap<PublicPostCard[]>(cacheKey, 300, async () => {
      const { items } = await this.loadPostCards(language, limit, 0, [
        ['viewCount', 'DESC'],
        ['publishedAt', 'DESC'],
        ['id', 'DESC'],
      ]);

      return items;
    });
  }
}
