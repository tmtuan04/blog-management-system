import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Includeable, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AppException } from '../../common/errors';
import {
  hasRichTextContent,
  sanitizeRichText,
} from '../../common/utils/html-sanitize';
import { Paginated, paginate, toOffset } from '../../common/utils/paginate';
import { CachePrefix } from '../../common/utils/redis-keys';
import { generateUniqueSlug } from '../../common/utils/slug';
import { escapeLike } from '../../common/utils/sql';
import { CacheService } from '../../infra/redis/cache.service';
import { UploadService } from '../../infra/upload/upload.service';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Category } from '../categories/models/category.model';
import { Language } from '../languages/models/language.model';
import { AdminPostQueryDto } from './dto/admin-post-query.dto';
import {
  AdminPostCategoryDto,
  AdminPostDetailDto,
  AdminPostListItemDto,
  AdminPostTranslationDto,
} from './dto/admin-post-response.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CATEGORY_MESSAGE, THUMBNAIL_MESSAGE } from './dto/post-fields';
import { TranslationFieldsDto } from './dto/translation-fields.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostStatus, PostTranslation } from './models/post-translation.model';
import { Post } from './models/post.model';

/** Giá trị ghi vào post_translations sau khi lọc HTML và sinh slug */
interface PreparedTranslation {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: PostStatus;
  publishedAt: Date | null;
}

/**
 * Include để map ra DTO. Danh sách không cần `content` của bản dịch (cột
 * MEDIUMTEXT) nên bỏ đi cho nhẹ.
 */
function postInclude(withContent: boolean): Includeable[] {
  return [
    { model: Language, attributes: ['id', 'code'] },
    {
      model: PostTranslation,
      attributes: withContent ? undefined : { exclude: ['content'] },
      include: [{ model: Language, attributes: ['id', 'code'] }],
    },
    {
      model: Category,
      attributes: ['id'],
      include: [
        {
          model: CategoryTranslation,
          attributes: ['name'],
          include: [{ model: Language, attributes: ['id', 'isDefault'] }],
        },
      ],
    },
  ];
}

/**
 * UC13 - Quản lý bài viết (phase 3 doc mục 4.5). Mọi thao tác chỉ làm việc với
 * bài của người đang đăng nhập, kể cả Super Admin.
 */
@Injectable()
export class AdminPostsService {
  constructor(
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation)
    private readonly translationModel: typeof PostTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    private readonly sequelize: Sequelize,
    private readonly cache: CacheService,
    private readonly upload: UploadService,
  ) {}

  /** GET /admin/posts */
  async list(
    userId: number,
    query: AdminPostQueryDto,
  ): Promise<Paginated<AdminPostListItemDto>> {
    const conditions: WhereOptions[] = [{ userId }];
    if (query.categoryId) {
      conditions.push({ categoryId: query.categoryId });
    }
    // Lọc theo bản dịch bằng EXISTS: include + where sẽ làm sai số đếm và
    // chỉ trả về một phần bản dịch của mỗi bài
    if (query.status) {
      conditions.push(
        this.translationExists(
          `pt.language_id = \`Post\`.\`language_id\` AND pt.status = ${this.sequelize.escape(query.status)}`,
        ),
      );
    }
    if (query.language) {
      conditions.push(
        this.translationExists(
          `pt.language_id = (SELECT l.id FROM languages l WHERE l.code = ${this.sequelize.escape(query.language)})`,
        ),
      );
    }
    if (query.q) {
      conditions.push(
        this.translationExists(
          `pt.title LIKE ${this.sequelize.escape(`%${escapeLike(query.q)}%`)}`,
        ),
      );
    }

    const { rows, count } = await this.postModel.findAndCountAll({
      attributes: ['id'],
      where: { [Op.and]: conditions },
      order: [
        // updatedAt lớn nhất giữa bài và các bản dịch, khớp với cột "Cập nhật"
        [
          Sequelize.literal(
            'GREATEST(`Post`.`updated_at`, COALESCE((SELECT MAX(pt.updated_at) FROM post_translations pt WHERE pt.post_id = `Post`.`id`), `Post`.`updated_at`))',
          ),
          'DESC',
        ],
        ['id', 'DESC'],
      ],
      ...toOffset(query),
    });

    const ids = rows.map((row) => row.id);
    const posts = ids.length
      ? await this.postModel.findAll({
          where: { id: ids },
          include: postInclude(false),
        })
      : [];
    const byId = new Map(posts.map((post) => [post.id, post]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((post): post is Post => post !== undefined)
      .map((post) => this.toListItem(post));

    return paginate(items, count, query);
  }

  /** POST /admin/posts: tạo bài và bản gốc trong cùng một transaction */
  async create(
    userId: number,
    dto: CreatePostDto,
  ): Promise<AdminPostDetailDto> {
    // Kiểm tra trước khi mở transaction để transaction ngắn
    const language = await this.resolveActiveLanguage(
      dto.languageCode,
      'languageCode',
    );
    await this.assertCategory(dto.categoryId);
    if (dto.thumbnail) {
      await this.assertThumbnail(dto.thumbnail);
    }
    const prepared = await this.prepareTranslation(
      dto.translation,
      language.id,
      'translation',
    );

    const postId = await this.sequelize.transaction(async (transaction) => {
      const post = await this.postModel.create(
        {
          userId,
          languageId: language.id,
          categoryId: dto.categoryId,
          thumbnail: dto.thumbnail ?? null,
        },
        { transaction },
      );
      await this.translationModel.create(
        { postId: post.id, languageId: language.id, ...prepared },
        { transaction },
      );
      return post.id;
    });

    await this.invalidateCache();
    return this.findOne(userId, postId);
  }

  /** GET /admin/posts/:id: mọi bản dịch, kể cả ở ngôn ngữ đã tắt */
  async findOne(userId: number, id: number): Promise<AdminPostDetailDto> {
    const post = await this.findOwnedPost(userId, id, true);
    return this.toDetail(post);
  }

  /** PATCH /admin/posts/:id: danh mục, thumbnail */
  async update(
    userId: number,
    id: number,
    dto: UpdatePostDto,
  ): Promise<AdminPostDetailDto> {
    const post = await this.findOwnedPost(userId, id);
    const oldThumbnail = post.thumbnail;

    if (dto.categoryId !== undefined) {
      await this.assertCategory(dto.categoryId);
      post.categoryId = dto.categoryId;
    }
    // undefined: giữ ảnh cũ, null: bỏ ảnh, chuỗi: đổi ảnh
    if (dto.thumbnail !== undefined) {
      if (dto.thumbnail !== null) {
        await this.assertThumbnail(dto.thumbnail);
      }
      post.thumbnail = dto.thumbnail;
    }
    await post.save();

    // Lưu DB xong mới xóa file, lưu lỗi thì ảnh cũ vẫn còn
    if (oldThumbnail && oldThumbnail !== post.thumbnail) {
      await this.upload.remove(oldThumbnail);
    }
    await this.invalidateCache();
    return this.findOne(userId, id);
  }

  /** DELETE /admin/posts/:id: bản dịch và bình luận xóa theo FK CASCADE */
  async remove(userId: number, id: number): Promise<void> {
    const post = await this.findOwnedPost(userId, id);
    await post.destroy();
    await this.upload.remove(post.thumbnail);
    await this.invalidateCache();
  }

  /** Không có → 404. Bài của người khác → 403 */
  private async findOwnedPost(
    userId: number,
    id: number,
    withDetails = false,
  ): Promise<Post> {
    const post = await this.postModel.findByPk(id, {
      include: withDetails ? postInclude(true) : undefined,
    });
    if (!post) {
      throw AppException.notFound('Không tìm thấy bài viết');
    }
    if (post.userId !== userId) {
      throw AppException.forbidden('Bạn chỉ quản lý được bài viết của mình');
    }
    return post;
  }

  /** Mã ngôn ngữ → Language. Không có hoặc đã tắt thì báo lỗi ở `field` */
  private async resolveActiveLanguage(
    code: string,
    field: string,
  ): Promise<Language> {
    const language = await this.languageModel.findOne({
      where: { code, isActive: true },
    });
    if (!language) {
      throw AppException.validation([
        { field, message: 'Ngôn ngữ không tồn tại hoặc đã tắt.' },
      ]);
    }
    return language;
  }

  private async assertCategory(categoryId: number): Promise<void> {
    const category = await this.categoryModel.findByPk(categoryId, {
      attributes: ['id'],
    });
    if (!category) {
      throw AppException.validation([
        { field: 'categoryId', message: CATEGORY_MESSAGE },
      ]);
    }
  }

  /** File phải tồn tại trong uploads/images (phase 3 doc mục 3.6) */
  private async assertThumbnail(path: string): Promise<void> {
    if (!(await this.upload.exists(path))) {
      throw AppException.validation([
        { field: 'thumbnail', message: THUMBNAIL_MESSAGE },
      ]);
    }
  }

  /**
   * Lọc HTML, sinh slug duy nhất trong ngôn ngữ, ghi publishedAt nếu đăng ngay.
   * `fieldPrefix` để lỗi ghi đúng field, ví dụ `translation.content`.
   */
  private async prepareTranslation(
    fields: TranslationFieldsDto,
    languageId: number,
    fieldPrefix: string,
    excludeId?: number,
  ): Promise<PreparedTranslation> {
    const content = sanitizeRichText(fields.content);
    if (!hasRichTextContent(content)) {
      throw AppException.validation([
        {
          field: `${fieldPrefix}.content`,
          message: 'Nhập nội dung bài viết.',
        },
      ]);
    }
    return {
      title: fields.title,
      slug: await generateUniqueSlug(
        fields.title,
        languageId,
        this.translationModel,
        { excludeId },
      ),
      excerpt: fields.excerpt || null,
      content,
      status: fields.status,
      publishedAt: fields.status === 'published' ? new Date() : null,
    };
  }

  /** Bài và bản dịch đổi thì số bài theo danh mục cũng đổi (mục 3.5) */
  private async invalidateCache(): Promise<void> {
    await Promise.all([
      this.cache.invalidate(CachePrefix.posts),
      this.cache.invalidate(CachePrefix.categories),
    ]);
  }

  private translationExists(condition: string) {
    return Sequelize.literal(
      `EXISTS (SELECT 1 FROM post_translations pt WHERE pt.post_id = \`Post\`.\`id\` AND ${condition})`,
    );
  }

  /** Bản gốc đứng đầu, các bản còn lại theo mã ngôn ngữ */
  private sortTranslations(post: Post): PostTranslation[] {
    return [...(post.translations ?? [])].sort((a, b) => {
      if (a.languageId === post.languageId) return -1;
      if (b.languageId === post.languageId) return 1;
      return (a.language?.code ?? '').localeCompare(b.language?.code ?? '');
    });
  }

  /** Tên danh mục theo ngôn ngữ mặc định */
  private toCategory(post: Post): AdminPostCategoryDto {
    const translations = post.category?.translations ?? [];
    const name =
      translations.find((translation) => translation.language?.isDefault)
        ?.name ??
      translations[0]?.name ??
      '';
    return { id: post.categoryId, name };
  }

  private toListItem(post: Post): AdminPostListItemDto {
    const translations = this.sortTranslations(post);
    const updatedAt = Math.max(
      post.updatedAt.getTime(),
      ...translations.map((translation) => translation.updatedAt.getTime()),
    );
    return {
      id: post.id,
      title: translations[0]?.title ?? '',
      languageCode: post.language?.code ?? '',
      category: this.toCategory(post),
      thumbnail: post.thumbnail,
      translations: translations.map((translation) => ({
        code: translation.language?.code ?? '',
        status: translation.status,
      })),
      updatedAt: new Date(updatedAt),
    };
  }

  private toDetail(post: Post): AdminPostDetailDto {
    return {
      id: post.id,
      languageCode: post.language?.code ?? '',
      category: this.toCategory(post),
      thumbnail: post.thumbnail,
      translations: this.sortTranslations(post).map(
        (translation): AdminPostTranslationDto => ({
          code: translation.language?.code ?? '',
          isOriginal: translation.languageId === post.languageId,
          title: translation.title,
          slug: translation.slug,
          excerpt: translation.excerpt,
          content: translation.content,
          status: translation.status,
          viewCount: translation.viewCount,
          publishedAt: translation.publishedAt,
          updatedAt: translation.updatedAt,
        }),
      ),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
