import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn, Op } from 'sequelize';

import { AppException } from '../../common/errors';
import type { RequestLanguage } from '../../common/types/request-context';
import { paginate, type Paginated } from '../../common/utils/paginate';
import { CacheTtl, RedisKeys } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';

import { LanguagesService } from '../languages/languages.service';
import { Post } from '../posts/models/post.model';
import { PostTranslation } from '../posts/models/post-translation.model';
import { LATEST_ORDER, PostsService } from '../posts/posts.service';
import type { PublicPostCardDto } from '../posts/dto/public-post-response.dto';

import {
  PublicCategoryDto,
  PublicCategoryDetailDto,
} from './dto/public-category-response.dto';
import { Category } from './models/category.model';
import { CategoryTranslation } from './models/category-translation.model';

const CATEGORY_NOT_FOUND = 'Không tìm thấy danh mục';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,

    @InjectModel(CategoryTranslation)
    private readonly translationModel: typeof CategoryTranslation,

    @InjectModel(PostTranslation)
    private readonly postTranslationModel: typeof PostTranslation,

    private readonly languagesService: LanguagesService,
    private readonly postsService: PostsService,
    private readonly cache: CacheService,
  ) {}

  /**
   * GET /categories
   * Danh sách danh mục, hỗ trợ ngôn ngữ và postCount.
   * Cache 10 phút.
   */
  findAll(language: RequestLanguage): Promise<PublicCategoryDto[]> {
    return this.cache.wrap(
      RedisKeys.categoriesList(language.code),
      CacheTtl.categories,
      async () => {
        const categories = await this.categoryModel.findAll({
          attributes: ['id'],
          order: [['id', 'ASC']],
        });

        if (categories.length === 0) return [];

        const languages = await this.languagesService.findActive();
        const defaultLanguage = languages.find((item) => item.isDefault);

        const languageIds = [
          ...new Set(
            [language.id, defaultLanguage?.id].filter(
              (id): id is number => id !== undefined,
            ),
          ),
        ];

        const ids = categories.map((category) => category.id);

        const [translations, counts] = await Promise.all([
          this.translationModel.findAll({
            where: {
              categoryId: { [Op.in]: ids },
              languageId: { [Op.in]: languageIds },
            },
          }),
          this.countPublished(language, ids),
        ]);

        return categories.flatMap((category): PublicCategoryDto[] => {
          const available = translations.filter(
            (item) => item.categoryId === category.id,
          );

          const selected =
            available.find((item) => item.languageId === language.id) ??
            available.find((item) => item.languageId === defaultLanguage?.id);

          // Theo quy tắc B3, mỗi danh mục phải có bản dịch mặc định.
          if (!selected) return [];

          return [
            {
              id: category.id,
              name: selected.name,
              slug: selected.slug,
              postCount: counts.get(category.id) ?? 0,
            },
          ];
        });
      },
    );
  }

  /**
   * GET /categories/:slug
   * Chi tiết danh mục và slug của các ngôn ngữ đang hoạt động.
   * Cache 10 phút.
   */
  findBySlug(
    language: RequestLanguage,
    slug: string,
  ): Promise<PublicCategoryDetailDto> {
    return this.cache.wrap(
      RedisKeys.categoryDetail(language.code, slug),
      CacheTtl.categories,
      async () => {
        const categoryId = await this.resolveCategoryId(language, slug);
        const languages = await this.languagesService.findActive();

        const translations = await this.translationModel.findAll({
          where: {
            categoryId,
            languageId: {
              [Op.in]: languages.map((item) => item.id),
            },
          },
        });

        const defaultLanguage = languages.find((item) => item.isDefault);

        const selected =
          translations.find((item) => item.languageId === language.id) ??
          translations.find((item) => item.languageId === defaultLanguage?.id);

        if (!selected) {
          throw AppException.notFound(CATEGORY_NOT_FOUND);
        }

        const counts = await this.countPublished(language, [categoryId]);

        const availableTranslations = languages.flatMap((item) => {
          const translation = translations.find(
            (row) => row.languageId === item.id,
          );

          return translation
            ? [{ code: item.code, slug: translation.slug }]
            : [];
        });

        return {
          id: categoryId,
          name: selected.name,
          slug: selected.slug,
          postCount: counts.get(categoryId) ?? 0,
          translations: availableTranslations,
        };
      },
    );
  }

  /**
   * GET /categories/:slug/posts
   * Tái sử dụng hàm tìm thẻ bài từ UC05.
   * Chỉ lấy bản dịch published của ngôn ngữ hiện tại.
   * Cache 5 phút.
   */
  async findPosts(
    language: RequestLanguage,
    slug: string,
    page = 1,
    limit = 10,
  ): Promise<Paginated<PublicPostCardDto>> {
    const categoryId = await this.resolveCategoryId(language, slug);

    // Cache dữ liệu thô: paginate() dùng Symbol không lưu qua JSON.
    const { items, total } = await this.cache.wrap(
      RedisKeys.categoryPosts(language.code, categoryId, page, limit),
      CacheTtl.posts,
      () =>
        this.postsService.findCards(language, {
          categoryId,
          limit,
          offset: (page - 1) * limit,
          order: LATEST_ORDER,
        }),
    );

    return paginate(items, total, { page, limit });
  }

  /**
   * Tìm danh mục bằng slug của ngôn ngữ đang chọn.
   * Nếu chưa có bản dịch ở ngôn ngữ này thì cho phép
   * dùng slug của ngôn ngữ mặc định.
   */
  private async resolveCategoryId(
    language: RequestLanguage,
    slug: string,
  ): Promise<number> {
    const selected = await this.translationModel.findOne({
      where: { languageId: language.id, slug },
      attributes: ['categoryId'],
    });

    if (selected) return selected.categoryId;

    const languages = await this.languagesService.findActive();
    const defaultLanguage = languages.find((item) => item.isDefault);

    if (!defaultLanguage || defaultLanguage.id === language.id) {
      throw AppException.notFound(CATEGORY_NOT_FOUND);
    }

    const fallback = await this.translationModel.findOne({
      where: {
        languageId: defaultLanguage.id,
        slug,
      },
      attributes: ['categoryId'],
    });

    if (!fallback) {
      throw AppException.notFound(CATEGORY_NOT_FOUND);
    }

    // Chỉ fallback nếu danh mục chưa có bản dịch ở ngôn ngữ chọn.
    const hasTranslation = await this.translationModel.count({
      where: {
        categoryId: fallback.categoryId,
        languageId: language.id,
      },
    });

    if (hasTranslation > 0) {
      throw AppException.notFound(CATEGORY_NOT_FOUND);
    }

    return fallback.categoryId;
  }

  /**
   * Đếm bài published theo ngôn ngữ, nhóm theo categoryId.
   * Dùng một truy vấn GROUP BY thay vì N truy vấn cho N danh mục.
   */
  private async countPublished(
    language: RequestLanguage,
    categoryIds: number[],
  ): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    if (categoryIds.length === 0) return result;

    const rows = (await this.postTranslationModel.findAll({
      attributes: [
        [col('post.category_id'), 'categoryId'],
        [fn('COUNT', col('PostTranslation.id')), 'postCount'],
      ],
      where: {
        languageId: language.id,
        status: 'published',
      },
      include: [
        {
          model: Post,
          as: 'post',
          attributes: [],
          required: true,
          where: {
            categoryId: { [Op.in]: categoryIds },
          },
        },
      ],
      group: [col('post.category_id')],
      raw: true,
    })) as unknown as {
      categoryId: number;
      postCount: number | string;
    }[];

    for (const row of rows) {
      result.set(Number(row.categoryId), Number(row.postCount));
    }

    return result;
  }
}
