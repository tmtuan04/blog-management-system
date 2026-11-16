import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, col, fn } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AppException, ErrorCode, FieldError } from '../../common/errors';
import { Paginated, paginate, toOffset } from '../../common/utils/paginate';
import { CachePrefix } from '../../common/utils/redis-keys';
import { generateUniqueSlug } from '../../common/utils/slug';
import { escapeLike } from '../../common/utils/sql';
import { CacheService } from '../../infra/redis/cache.service';
import { Language } from '../languages/models/language.model';
import { Post } from '../posts/models/post.model';
import { AdminCategoryQueryDto } from './dto/admin-category-query.dto';
import {
  AdminCategoryDto,
  CategoryTranslationItemDto,
} from './dto/admin-category-response.dto';
import {
  CATEGORY_NAME_MAX,
  CATEGORY_NAME_MIN,
  NAMES_MESSAGE,
  SaveCategoryDto,
} from './dto/save-category.dto';
import { CategoryTranslation } from './models/category-translation.model';
import { Category } from './models/category.model';

/** Cột slug dài 180: chừa chỗ cho hậu tố `-2`, `-3`... */
const SLUG_MAX_LENGTH = 170;

/** Tên đã kiểm tra: languageId → tên (rỗng là bỏ bản dịch ở ngôn ngữ đó) */
type NameMap = Map<number, string>;

/**
 * UC15 - Quản lý danh mục (phase 3 doc mục 4.6). Ghi xong xóa cache `categories`
 * và `posts` vì tên danh mục nằm trong thẻ bài.
 */
@Injectable()
export class AdminCategoriesService {
  constructor(
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation)
    private readonly translationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    @InjectModel(Post) private readonly postModel: typeof Post,
    private readonly sequelize: Sequelize,
    private readonly cache: CacheService,
  ) {}

  /** GET /admin/categories */
  async list(
    query: AdminCategoryQueryDto,
  ): Promise<Paginated<AdminCategoryDto>> {
    const where: Record<string, unknown> = {};
    if (query.q) {
      const matched = (await this.translationModel.findAll({
        attributes: ['categoryId'],
        where: { name: { [Op.like]: `%${escapeLike(query.q)}%` } },
        group: ['categoryId'],
        raw: true,
      })) as unknown as { categoryId: number }[];
      where.id = matched.map((row) => row.categoryId);
    }

    const { rows, count } = await this.categoryModel.findAndCountAll({
      where,
      order: [['id', 'ASC']],
      ...toOffset(query),
    });
    const items = await this.toDtos(rows);
    return paginate(items, count, query);
  }

  /** POST /admin/categories */
  async create(dto: SaveCategoryDto): Promise<AdminCategoryDto> {
    const names = await this.validateNames(dto.names);

    const categoryId = await this.sequelize.transaction(async (transaction) => {
      const category = await this.categoryModel.create({}, { transaction });
      const rows: {
        categoryId: number;
        languageId: number;
        name: string;
        slug: string;
      }[] = [];
      for (const [languageId, name] of names) {
        if (name) {
          rows.push({
            categoryId: category.id,
            languageId,
            name,
            slug: await this.slugFor(name, languageId),
          });
        }
      }
      await this.translationModel.bulkCreate(rows, { transaction });
      return category.id;
    });

    await this.invalidateCache();
    return this.getOne(categoryId);
  }

  /**
   * PATCH /admin/categories/:id. Ngôn ngữ không có trong `names` thì giữ nguyên;
   * tên rỗng ở ngôn ngữ không mặc định thì xóa bản dịch đó; đổi tên thì sinh lại slug.
   */
  async update(id: number, dto: SaveCategoryDto): Promise<AdminCategoryDto> {
    const category = await this.findOrFail(id);
    const names = await this.validateNames(dto.names);
    const existing = await this.translationModel.findAll({
      where: { categoryId: id },
    });
    const byLanguage = new Map(existing.map((row) => [row.languageId, row]));

    await this.sequelize.transaction(async (transaction) => {
      for (const [languageId, name] of names) {
        const current = byLanguage.get(languageId);
        if (!name) {
          await current?.destroy({ transaction });
        } else if (!current) {
          await this.translationModel.create(
            {
              categoryId: id,
              languageId,
              name,
              slug: await this.slugFor(name, languageId),
            },
            { transaction },
          );
        } else if (current.name !== name) {
          await current.update(
            {
              name,
              slug: await this.slugFor(name, languageId, current.id),
            },
            { transaction },
          );
        }
      }
      // Đổi updatedAt của danh mục để màn quản lý biết vừa sửa
      category.changed('updatedAt', true);
      await category.save({ transaction });
    });

    await this.invalidateCache();
    return this.getOne(id);
  }

  /** DELETE /admin/categories/:id */
  async remove(id: number): Promise<void> {
    const category = await this.findOrFail(id);
    const total = await this.postModel.count({ where: { categoryId: id } });
    if (total > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.CATEGORY_IN_USE,
        `Danh mục đang có ${total} bài viết. Chuyển các bài viết sang danh mục khác rồi thử xóa lại.`,
      );
    }
    // category_translations xóa theo khóa ngoại CASCADE
    await category.destroy();
    await this.invalidateCache();
  }

  /**
   * Kiểm tra `names`: mã phải là ngôn ngữ đã có, giá trị là chuỗi, tên ngôn ngữ
   * mặc định bắt buộc, tên khác rỗng dài 2-150 ký tự. Báo mọi lỗi trong một lần.
   */
  private async validateNames(
    input: Record<string, unknown>,
  ): Promise<NameMap> {
    const languages = await this.languageModel.findAll();
    const byCode = new Map(
      languages.map((language) => [language.code, language]),
    );
    const errors: FieldError[] = [];
    const names: NameMap = new Map();

    for (const [code, value] of Object.entries(input)) {
      const field = `names.${code}`;
      const language = byCode.get(code);
      if (!language) {
        errors.push({ field, message: `Ngôn ngữ “${code}” không tồn tại.` });
        continue;
      }
      if (typeof value !== 'string') {
        errors.push({ field, message: NAMES_MESSAGE });
        continue;
      }
      const name = value.trim();
      if (
        name &&
        (name.length < CATEGORY_NAME_MIN || name.length > CATEGORY_NAME_MAX)
      ) {
        errors.push({
          field,
          message: `Tên danh mục từ ${CATEGORY_NAME_MIN} đến ${CATEGORY_NAME_MAX} ký tự.`,
        });
        continue;
      }
      names.set(language.id, name);
    }

    const defaultLanguage = languages.find((language) => language.isDefault);
    if (defaultLanguage && !names.get(defaultLanguage.id)) {
      const field = `names.${defaultLanguage.code}`;
      if (!errors.some((error) => error.field === field)) {
        errors.push({
          field,
          message: `Nhập tên danh mục ở ngôn ngữ mặc định (${defaultLanguage.name}).`,
        });
      }
    }

    if (errors.length > 0) {
      throw AppException.validation(errors);
    }
    return names;
  }

  private slugFor(name: string, languageId: number, excludeId?: number) {
    return generateUniqueSlug(name, languageId, this.translationModel, {
      excludeId,
      maxLength: SLUG_MAX_LENGTH,
    });
  }

  private async findOrFail(id: number): Promise<Category> {
    const category = await this.categoryModel.findByPk(id);
    if (!category) {
      throw AppException.notFound('Không tìm thấy danh mục');
    }
    return category;
  }

  private async getOne(id: number): Promise<AdminCategoryDto> {
    const [dto] = await this.toDtos([await this.findOrFail(id)]);
    return dto;
  }

  private invalidateCache(): Promise<unknown> {
    return Promise.all([
      this.cache.invalidate(CachePrefix.categories),
      this.cache.invalidate(CachePrefix.posts),
    ]);
  }

  /** Gộp bản dịch và số bài của cả trang bằng 2 câu truy vấn, không N+1 */
  private async toDtos(categories: Category[]): Promise<AdminCategoryDto[]> {
    if (categories.length === 0) {
      return [];
    }
    const ids = categories.map((category) => category.id);
    const [translations, counts] = await Promise.all([
      this.translationModel.findAll({
        where: { categoryId: ids },
        include: [
          {
            model: Language,
            attributes: ['code', 'isDefault'],
            required: true,
          },
        ],
      }),
      this.postModel.findAll({
        attributes: ['categoryId', [fn('COUNT', col('id')), 'total']],
        where: { categoryId: ids },
        group: ['categoryId'],
        raw: true,
      }) as unknown as Promise<{ categoryId: number; total: number }[]>,
    ]);

    const totals = new Map(
      counts.map((row) => [row.categoryId, Number(row.total)]),
    );
    const grouped = new Map<number, CategoryTranslation[]>();
    for (const translation of translations) {
      const list = grouped.get(translation.categoryId) ?? [];
      list.push(translation);
      grouped.set(translation.categoryId, list);
    }

    return categories.map((category) => ({
      id: category.id,
      translations: (grouped.get(category.id) ?? [])
        .sort(
          (a, b) =>
            Number(b.language!.isDefault) - Number(a.language!.isDefault) ||
            a.languageId - b.languageId,
        )
        .map((translation): CategoryTranslationItemDto => ({
          code: translation.language!.code,
          name: translation.name,
          slug: translation.slug,
        })),
      postCount: totals.get(category.id) ?? 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }
}
