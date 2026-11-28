import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AppException, FieldError } from '../../common/errors';
import {
  hasRichTextContent,
  sanitizeRichText,
} from '../../common/utils/html-sanitize';
import { Language } from '../languages/models/language.model';
import {
  AdminPageDto,
  AdminPageListItemDto,
} from './dto/admin-page-response.dto';
import {
  PAGE_TITLE_MAX,
  PAGE_TITLE_MIN,
  SavePageDto,
} from './dto/save-page.dto';
import { PageTranslation } from './models/page-translation.model';
import { Page } from './models/page.model';

const PAGE_NOT_FOUND = 'Không tìm thấy trang';
const DEFAULT_TITLE_MESSAGE = `Tiêu đề của ngôn ngữ mặc định cần từ ${PAGE_TITLE_MIN} đến ${PAGE_TITLE_MAX} ký tự.`;
const DEFAULT_CONTENT_MESSAGE = 'Nhập nội dung ở ngôn ngữ mặc định.';
const TITLE_MESSAGE = `Tiêu đề cần từ ${PAGE_TITLE_MIN} đến ${PAGE_TITLE_MAX} ký tự.`;
const PAIR_MESSAGE = 'Điền đủ cả tiêu đề và nội dung, hoặc để trống cả hai.';

interface TabValue {
  title: string;
  content: string;
}

/** Kết quả kiểm tra `translations`: bản dịch cần ghi và ngôn ngữ cần xóa bản dịch */
interface ValidatedTabs {
  toSave: Map<number, TabValue>;
  toDelete: number[];
}

/**
 * UC18 - Quản lý trang tĩnh (phase 3 doc mục 4.6). Danh sách trang cố định (tạo bằng
 * seeder): chỉ sửa nội dung và bật/tắt hiển thị. Trang tĩnh không cache nên ghi xong
 * không phải xóa cache nào.
 */
@Injectable()
export class AdminPagesService {
  constructor(
    @InjectModel(Page) private readonly pageModel: typeof Page,
    @InjectModel(PageTranslation)
    private readonly translationModel: typeof PageTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    private readonly sequelize: Sequelize,
  ) {}

  /** GET /admin/pages */
  async list(): Promise<AdminPageListItemDto[]> {
    const [pages, languages] = await Promise.all([
      // Không lấy `content` (mediumtext), danh sách chỉ cần biết ngôn ngữ nào đã có
      this.pageModel.findAll({
        include: [
          {
            model: PageTranslation,
            attributes: ['id', 'languageId', 'title'],
            required: false,
          },
        ],
        order: [['id', 'ASC']],
      }),
      this.activeLanguages(),
    ]);
    const defaultLanguage = languages.find((language) => language.isDefault);

    return pages.map((page) => {
      const translations = page.translations ?? [];
      const filled = new Set(translations.map((item) => item.languageId));
      const defaultTitle = translations.find(
        (item) => item.languageId === defaultLanguage?.id,
      )?.title;
      return {
        key: page.key,
        title: defaultTitle ?? page.key,
        languages: languages
          .filter((language) => filled.has(language.id))
          .map((language) => language.code),
        isVisible: page.isVisible,
        updatedAt: page.updatedAt,
      };
    });
  }

  /** GET /admin/pages/:key */
  async findByKey(key: string): Promise<AdminPageDto> {
    const [page, languages] = await Promise.all([
      this.pageModel.findOne({
        where: { key },
        include: [{ model: PageTranslation, required: false }],
      }),
      this.activeLanguages(),
    ]);
    if (!page) {
      throw AppException.notFound(PAGE_NOT_FOUND);
    }
    const translations = page.translations ?? [];
    return {
      key: page.key,
      isVisible: page.isVisible,
      updatedAt: page.updatedAt,
      translations: languages.map((language) => {
        const row = translations.find(
          (item) => item.languageId === language.id,
        );
        return {
          code: language.code,
          name: language.name,
          isDefault: language.isDefault,
          title: row?.title ?? '',
          content: row?.content ?? '',
        };
      }),
    };
  }

  /**
   * PUT /admin/pages/:key. Khóa dòng trang để hai người lưu cùng lúc không tạo trùng bản
   * dịch. Kiểm tra mọi tab trước khi ghi và báo hết lỗi trong một lần.
   */
  async save(key: string, dto: SavePageDto): Promise<AdminPageDto> {
    await this.sequelize.transaction(async (transaction) => {
      const page = await this.pageModel.findOne({
        where: { key },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!page) {
        throw AppException.notFound(PAGE_NOT_FOUND);
      }
      const languages = await this.languageModel.findAll({ transaction });
      const { toSave, toDelete } = this.validate(dto, languages);

      // update() tĩnh luôn cập nhật `updated_at`, kể cả khi chỉ sửa bản dịch
      await this.pageModel.update(
        { isVisible: dto.isVisible },
        { where: { id: page.id }, transaction },
      );
      const existing = await this.translationModel.findAll({
        where: { pageId: page.id },
        transaction,
      });
      const byLanguage = new Map(existing.map((row) => [row.languageId, row]));
      for (const [languageId, value] of toSave) {
        const row = byLanguage.get(languageId);
        if (row) {
          await row.update(value, { transaction });
        } else {
          await this.translationModel.create(
            { pageId: page.id, languageId, ...value },
            { transaction },
          );
        }
      }
      if (toDelete.length > 0) {
        await this.translationModel.destroy({
          where: { pageId: page.id, languageId: toDelete },
          transaction,
        });
      }
    });
    return this.findByKey(key);
  }

  /**
   * Quy tắc từng tab (requirements UC18):
   * - Ngôn ngữ mặc định: bắt buộc tiêu đề 2-255 ký tự và nội dung. Không gửi tab này
   *   thì coi như tab trống nên báo cả hai lỗi.
   * - Ngôn ngữ khác: đủ cả hai (tiêu đề 2-255 ký tự) thì lưu, trống cả hai thì xóa bản
   *   dịch, thiếu một trong hai thì lỗi.
   * Ngôn ngữ không có trong body thì giữ nguyên. Ngôn ngữ đang tắt vẫn lưu được.
   */
  private validate(dto: SavePageDto, languages: Language[]): ValidatedTabs {
    const byCode = new Map(
      languages.map((language) => [language.code, language]),
    );
    const defaultLanguage = languages.find((language) => language.isDefault);
    const errors: FieldError[] = [];
    const toSave = new Map<number, TabValue>();
    const toDelete: number[] = [];
    const seen = new Set<string>();

    for (const tab of dto.translations) {
      const code = tab.code.trim().toLowerCase();
      const field = `translations.${code}`;
      const language = byCode.get(code);
      if (!language) {
        errors.push({ field, message: `Ngôn ngữ “${code}” không tồn tại.` });
        continue;
      }
      if (seen.has(code)) {
        errors.push({ field, message: `Ngôn ngữ “${code}” bị gửi trùng.` });
        continue;
      }
      seen.add(code);

      const title = (tab.title ?? '').trim();
      const content = sanitizeRichText(tab.content ?? '');
      const hasTitle = title.length > 0;
      const hasContent = hasRichTextContent(content);
      const titleLengthOk =
        title.length >= PAGE_TITLE_MIN && title.length <= PAGE_TITLE_MAX;

      if (language.isDefault) {
        if (!titleLengthOk) {
          errors.push({
            field: `${field}.title`,
            message: DEFAULT_TITLE_MESSAGE,
          });
        }
        if (!hasContent) {
          errors.push({
            field: `${field}.content`,
            message: DEFAULT_CONTENT_MESSAGE,
          });
        }
        if (titleLengthOk && hasContent) {
          toSave.set(language.id, { title, content });
        }
      } else if (!hasTitle && !hasContent) {
        toDelete.push(language.id);
      } else if (!hasTitle || !hasContent) {
        errors.push({
          field: `${field}.${hasTitle ? 'content' : 'title'}`,
          message: PAIR_MESSAGE,
        });
      } else if (!titleLengthOk) {
        errors.push({ field: `${field}.title`, message: TITLE_MESSAGE });
      } else {
        toSave.set(language.id, { title, content });
      }
    }

    if (defaultLanguage && !seen.has(defaultLanguage.code)) {
      const field = `translations.${defaultLanguage.code}`;
      errors.push(
        { field: `${field}.title`, message: DEFAULT_TITLE_MESSAGE },
        { field: `${field}.content`, message: DEFAULT_CONTENT_MESSAGE },
      );
    }

    if (errors.length > 0) {
      throw AppException.validation(errors);
    }
    return { toSave, toDelete };
  }

  /** Ngôn ngữ đang hoạt động, mặc định đứng đầu */
  private activeLanguages(): Promise<Language[]> {
    return this.languageModel.findAll({
      where: { isActive: true },
      order: [
        ['isDefault', 'DESC'],
        ['id', 'ASC'],
      ],
    });
  }
}
