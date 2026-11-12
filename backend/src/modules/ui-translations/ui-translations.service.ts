import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { AppException, ErrorCode, FieldError } from '../../common/errors';
import { Paginated, paginate, toOffset } from '../../common/utils/paginate';
import {
  CachePrefix,
  CacheTtl,
  RedisKeys,
} from '../../common/utils/redis-keys';
import { escapeLike } from '../../common/utils/sql';
import { CacheService } from '../../infra/redis/cache.service';
import {
  ActiveLanguage,
  LanguagesService,
} from '../languages/languages.service';
import {
  CreateUiTranslationDto,
  REQUIRED_MESSAGE,
  UpdateUiTranslationValueDto,
  VALUE_MAX_LENGTH,
  VALUE_MAX_MESSAGE,
} from './dto/save-ui-translation.dto';
import { UiTranslationQueryDto } from './dto/ui-translation-query.dto';
import { UiTranslationRowDto } from './dto/ui-translation-response.dto';
import { UiTranslation } from './models/ui-translation.model';

type ValueRow = Pick<UiTranslation, 'languageId' | 'key' | 'value'>;

/**
 * UC17 - Bản dịch giao diện (phase 3 doc mục 4.2, 4.6). Màn quản trị làm việc với
 * các ngôn ngữ đang hoạt động, mỗi ngôn ngữ một cột.
 */
@Injectable()
export class UiTranslationsService {
  constructor(
    @InjectModel(UiTranslation)
    private readonly uiTranslationModel: typeof UiTranslation,
    private readonly languagesService: LanguagesService,
    private readonly cache: CacheService,
  ) {}

  /**
   * GET /ui-translations/:code. Key nào ngôn ngữ `code` chưa có thì lấy giá trị của
   * ngôn ngữ mặc định. Cache 10 phút.
   */
  async getPublic(code: string): Promise<Record<string, string>> {
    const languages = await this.languagesService.findActive();
    const language = languages.find((item) => item.code === code);
    if (!language) {
      throw AppException.notFound('Không tìm thấy ngôn ngữ');
    }
    return this.cache.wrap(
      RedisKeys.uiTranslations(language.code),
      CacheTtl.ui,
      async () => {
        const defaultLanguage = languages.find((item) => item.isDefault);
        const languageIds = [
          ...new Set([defaultLanguage?.id ?? language.id, language.id]),
        ];
        const rows = (await this.uiTranslationModel.findAll({
          attributes: ['languageId', 'key', 'value'],
          where: { languageId: languageIds },
          order: [['key', 'ASC']],
          raw: true,
        })) as ValueRow[];
        const result: Record<string, string> = {};
        // Ghi giá trị mặc định trước, giá trị của ngôn ngữ được hỏi ghi đè lên
        for (const languageId of languageIds) {
          for (const row of rows) {
            if (row.languageId === languageId) {
              result[row.key] = row.value;
            }
          }
        }
        return result;
      },
    );
  }

  /** GET /admin/ui-translations */
  async list(
    query: UiTranslationQueryDto,
  ): Promise<Paginated<UiTranslationRowDto>> {
    const languages = await this.languagesService.findActive();
    const languageId = languages.map((language) => language.id);
    const where: WhereOptions<UiTranslation> = { languageId };
    if (query.q) {
      const pattern = `%${escapeLike(query.q)}%`;
      Object.assign(where, {
        [Op.or]: [
          { key: { [Op.like]: pattern } },
          { value: { [Op.like]: pattern } },
        ],
      });
    }

    // Phân trang theo key: lấy các key của trang trước, rồi lấy giá trị của chúng
    // ở mọi ngôn ngữ trong một câu
    const [total, keyRows] = await Promise.all([
      this.uiTranslationModel.count({ where, distinct: true, col: 'key' }),
      this.uiTranslationModel.findAll({
        attributes: ['key'],
        where,
        group: ['key'],
        order: [['key', 'ASC']],
        ...toOffset(query),
        raw: true,
      }),
    ]);
    const keys = keyRows.map((row) => row.key);
    const rows = keys.length ? await this.findValues(keys, languageId) : [];
    return paginate(
      keys.map((key) => this.toRow(key, rows, languages)),
      total,
      query,
    );
  }

  /** POST /admin/ui-translations */
  async create(dto: CreateUiTranslationDto): Promise<UiTranslationRowDto> {
    const languages = await this.languagesService.findActive();
    const values = this.validateValues(dto.values, languages);

    if (await this.keyExists(dto.key)) {
      const message = `Key “${dto.key}” đã có. Tìm key đó trong bảng để sửa giá trị.`;
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.CONFLICT, message, [
        { field: 'key', message },
      ]);
    }

    await this.uiTranslationModel.bulkCreate(
      [...values].map(([languageId, value]) => ({
        languageId,
        key: dto.key,
        value,
      })),
    );
    await this.cache.invalidate(CachePrefix.ui);
    return {
      key: dto.key,
      values: Object.fromEntries(
        languages.map((language) => [
          language.code,
          values.get(language.id) ?? null,
        ]),
      ),
    };
  }

  /** PUT /admin/ui-translations/:key/:code */
  async updateValue(
    key: string,
    code: string,
    dto: UpdateUiTranslationValueDto,
  ): Promise<UiTranslationRowDto> {
    const languages = await this.languagesService.findActive();
    const language = languages.find((item) => item.code === code);
    if (!language) {
      throw AppException.notFound('Không tìm thấy ngôn ngữ');
    }
    if (!(await this.keyExists(key))) {
      throw AppException.notFound('Không tìm thấy key');
    }

    const where = { key, languageId: language.id };
    if (dto.value === '') {
      if (language.isDefault) {
        throw AppException.validation([
          { field: 'value', message: REQUIRED_MESSAGE },
        ]);
      }
      // Ô trống: xóa dòng để giao diện dùng giá trị của ngôn ngữ mặc định
      await this.uiTranslationModel.destroy({ where });
    } else {
      const existing = await this.uiTranslationModel.findOne({ where });
      if (existing) {
        await existing.update({ value: dto.value });
      } else {
        await this.uiTranslationModel.create({ ...where, value: dto.value });
      }
    }
    await this.cache.invalidate(CachePrefix.ui);

    const languageIds = languages.map((item) => item.id);
    const rows = await this.findValues([key], languageIds);
    // Lấy cách viết key đang lưu (MySQL so sánh không phân biệt hoa thường)
    return this.toRow(rows[0]?.key ?? key, rows, languages);
  }

  /** DELETE /admin/ui-translations/:key: xóa key ở mọi ngôn ngữ, kể cả ngôn ngữ đã tắt */
  async remove(key: string): Promise<void> {
    const deleted = await this.uiTranslationModel.destroy({ where: { key } });
    if (deleted === 0) {
      throw AppException.notFound('Không tìm thấy key');
    }
    await this.cache.invalidate(CachePrefix.ui);
  }

  /**
   * Kiểm tra `values` của POST: mã phải là ngôn ngữ đang hoạt động, giá trị là chuỗi
   * tối đa 255 ký tự, ngôn ngữ mặc định bắt buộc. Trả Map languageId → giá trị đã
   * trim, bỏ các ô trống.
   */
  private validateValues(
    input: Record<string, unknown>,
    languages: ActiveLanguage[],
  ): Map<number, string> {
    const errors: FieldError[] = [];
    const values = new Map<number, string>();
    for (const [code, raw] of Object.entries(input)) {
      const field = `values.${code}`;
      const language = languages.find((item) => item.code === code);
      if (!language) {
        errors.push({
          field,
          message: 'Ngôn ngữ không tồn tại hoặc đã tắt.',
        });
      } else if (raw !== null && typeof raw !== 'string') {
        errors.push({ field, message: 'Giá trị phải là chuỗi.' });
      } else if ((raw ?? '').trim().length > VALUE_MAX_LENGTH) {
        errors.push({ field, message: VALUE_MAX_MESSAGE });
      } else if ((raw ?? '').trim() !== '') {
        values.set(language.id, (raw as string).trim());
      }
    }
    const defaultLanguage = languages.find((item) => item.isDefault);
    const defaultField = `values.${defaultLanguage?.code}`;
    if (
      defaultLanguage &&
      !values.has(defaultLanguage.id) &&
      !errors.some((error) => error.field === defaultField)
    ) {
      errors.push({ field: defaultField, message: REQUIRED_MESSAGE });
    }
    if (errors.length) {
      throw AppException.validation(errors);
    }
    return values;
  }

  private async keyExists(key: string): Promise<boolean> {
    return (await this.uiTranslationModel.count({ where: { key } })) > 0;
  }

  private findValues(keys: string[], languageId: number[]) {
    return this.uiTranslationModel.findAll({
      attributes: ['languageId', 'key', 'value'],
      where: { key: keys, languageId },
      raw: true,
    }) as Promise<ValueRow[]>;
  }

  private toRow(
    key: string,
    rows: ValueRow[],
    languages: ActiveLanguage[],
  ): UiTranslationRowDto {
    const values: Record<string, string | null> = {};
    for (const language of languages) {
      values[language.code] =
        rows.find(
          (row) =>
            row.languageId === language.id &&
            row.key.toLowerCase() === key.toLowerCase(),
        )?.value ?? null;
    }
    return { key, values };
  }
}
