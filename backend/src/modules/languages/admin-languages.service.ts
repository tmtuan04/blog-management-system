import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AppException, ErrorCode } from '../../common/errors';
import { CachePrefix } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { PostTranslation } from '../posts/models/post-translation.model';
import { UiTranslation } from '../ui-translations/models/ui-translation.model';
import { AdminLanguageDto } from './dto/admin-language-response.dto';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/save-language.dto';
import { Language } from './models/language.model';

/**
 * UC16 - Quản lý ngôn ngữ (phase 3 doc mục 4.6). Mọi thao tác ghi đều xóa toàn bộ
 * `cache:` vì ngôn ngữ ảnh hưởng tới mọi response public.
 */
@Injectable()
export class AdminLanguagesService {
  constructor(
    @InjectModel(Language) private readonly languageModel: typeof Language,
    @InjectModel(UiTranslation)
    private readonly uiTranslationModel: typeof UiTranslation,
    @InjectModel(PostTranslation)
    private readonly postTranslationModel: typeof PostTranslation,
    private readonly sequelize: Sequelize,
    private readonly cache: CacheService,
  ) {}

  /** GET /admin/languages */
  async list(): Promise<AdminLanguageDto[]> {
    const [languages, counts] = await Promise.all([
      this.languageModel.findAll({
        order: [
          ['isDefault', 'DESC'],
          ['id', 'ASC'],
        ],
      }),
      // Một câu GROUP BY cho mọi ngôn ngữ, không đếm từng dòng
      this.postTranslationModel.findAll({
        attributes: ['languageId', [fn('COUNT', col('id')), 'total']],
        group: ['languageId'],
        raw: true,
      }) as unknown as Promise<{ languageId: number; total: number }[]>,
    ]);
    const totals = new Map(
      counts.map((row) => [row.languageId, Number(row.total)]),
    );
    return languages.map((language) =>
      this.toDto(language, totals.get(language.id) ?? 0),
    );
  }

  /** POST /admin/languages */
  async create(dto: CreateLanguageDto): Promise<AdminLanguageDto> {
    if (await this.languageModel.findOne({ where: { code: dto.code } })) {
      const message = `Mã “${dto.code}” đã có trong danh sách.`;
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.CONFLICT, message, [
        { field: 'code', message },
      ]);
    }

    const language = await this.sequelize.transaction(async (transaction) => {
      const created = await this.languageModel.create(
        { code: dto.code, name: dto.name, isActive: dto.isActive ?? true },
        { transaction },
      );
      // Sao chép mọi key của ngôn ngữ mặc định, giữ nguyên giá trị để admin dịch dần
      const defaultLanguage = await this.languageModel.findOne({
        where: { isDefault: true },
        transaction,
      });
      if (defaultLanguage) {
        const rows = await this.uiTranslationModel.findAll({
          attributes: ['key', 'value'],
          where: { languageId: defaultLanguage.id },
          raw: true,
          transaction,
        });
        await this.uiTranslationModel.bulkCreate(
          rows.map(({ key, value }) => ({
            languageId: created.id,
            key,
            value,
          })),
          { transaction },
        );
      }
      return created;
    });

    await this.cache.invalidate(CachePrefix.all);
    return this.toDto(language, 0);
  }

  /** PATCH /admin/languages/:id */
  async update(id: number, dto: UpdateLanguageDto): Promise<AdminLanguageDto> {
    const language = await this.findOrFail(id);
    if (language.isDefault && dto.isActive === false) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.BAD_REQUEST,
        'Không thể tắt ngôn ngữ mặc định',
      );
    }
    await language.update({
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    await this.cache.invalidate(CachePrefix.all);
    return this.toDto(language, await this.countPostTranslations(id));
  }

  /** PATCH /admin/languages/:id/default */
  async setDefault(id: number): Promise<AdminLanguageDto> {
    const language = await this.findOrFail(id);
    if (!language.isActive) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.BAD_REQUEST,
        'Bật ngôn ngữ trước khi đặt làm mặc định',
      );
    }
    if (!language.isDefault) {
      // Bỏ mặc định cũ và đặt mặc định mới cùng lúc để luôn có đúng 1 ngôn ngữ mặc định
      await this.sequelize.transaction(async (transaction) => {
        await this.languageModel.update(
          { isDefault: false },
          { where: { isDefault: true }, transaction },
        );
        await language.update({ isDefault: true }, { transaction });
      });
      await this.cache.invalidate(CachePrefix.all);
    }
    return this.toDto(language, await this.countPostTranslations(id));
  }

  /** DELETE /admin/languages/:id */
  async remove(id: number): Promise<void> {
    const language = await this.findOrFail(id);
    if (language.isDefault) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.BAD_REQUEST,
        'Không thể xóa ngôn ngữ mặc định',
      );
    }
    // Ngôn ngữ gốc của bài cũng có một dòng post_translations nên chỉ cần đếm bảng này
    const total = await this.countPostTranslations(id);
    if (total > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.LANGUAGE_IN_USE,
        `Ngôn ngữ đang có ${total} bản dịch bài viết. Bạn có thể tắt ngôn ngữ để ẩn khỏi trang public.`,
      );
    }
    // category_translations, ui_translations, page_translations xóa theo khóa ngoại CASCADE
    await language.destroy();
    await this.cache.invalidate(CachePrefix.all);
  }

  private async findOrFail(id: number): Promise<Language> {
    const language = await this.languageModel.findByPk(id);
    if (!language) {
      throw AppException.notFound('Không tìm thấy ngôn ngữ');
    }
    return language;
  }

  private countPostTranslations(languageId: number): Promise<number> {
    return this.postTranslationModel.count({ where: { languageId } });
  }

  private toDto(
    language: Language,
    postTranslationCount: number,
  ): AdminLanguageDto {
    return {
      id: language.id,
      code: language.code,
      name: language.name,
      isDefault: language.isDefault,
      isActive: language.isActive,
      postTranslationCount,
    };
  }
}
