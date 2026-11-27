import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AppException } from '../../common/errors';
import type { RequestLanguage } from '../../common/types/request-context';
import { LanguagesService } from '../languages/languages.service';
import {
  PublicPageDto,
  PublicPageLinkDto,
} from './dto/public-page-response.dto';
import { PageTranslation } from './models/page-translation.model';
import { Page } from './models/page.model';

/**
 * UC11 - Xem trang tĩnh. Trang đang ẩn hoặc không có thì như không tồn tại. Ngôn ngữ
 * đang chọn chưa có nội dung thì dùng bản của ngôn ngữ mặc định. Không cache.
 */
@Injectable()
export class PagesService {
  constructor(
    @InjectModel(Page) private readonly pageModel: typeof Page,
    private readonly languages: LanguagesService,
  ) {}

  /** GET /pages */
  async list(language: RequestLanguage): Promise<PublicPageLinkDto[]> {
    const languageIds = await this.languageIds(language);
    const pages = await this.pageModel.findAll({
      where: { isVisible: true },
      include: this.include(languageIds),
      order: [['id', 'ASC']],
    });
    return pages.flatMap((page) => {
      const translation = this.pick(page, language.id, languageIds);
      return translation ? [{ key: page.key, title: translation.title }] : [];
    });
  }

  /** GET /pages/:key */
  async findByKey(
    key: string,
    language: RequestLanguage,
  ): Promise<PublicPageDto> {
    const languageIds = await this.languageIds(language);
    const page = await this.pageModel.findOne({
      where: { key, isVisible: true },
      include: this.include(languageIds),
    });
    const translation = page && this.pick(page, language.id, languageIds);
    if (!page || !translation) {
      throw AppException.notFound('Không tìm thấy trang');
    }
    return {
      key: page.key,
      title: translation.title,
      content: translation.content,
    };
  }

  /** Ngôn ngữ đang chọn, thêm ngôn ngữ mặc định để fallback */
  private async languageIds(language: RequestLanguage): Promise<number[]> {
    if (language.isDefault) {
      return [language.id];
    }
    const active = await this.languages.findActive();
    const defaultLanguage = active.find((item) => item.isDefault);
    return defaultLanguage ? [language.id, defaultLanguage.id] : [language.id];
  }

  /** LEFT JOIN, chỉ lấy bản dịch của các ngôn ngữ cần, không có thì lọc ở `pick` */
  private include(languageIds: number[]) {
    return [
      {
        model: PageTranslation,
        required: false,
        where: { languageId: languageIds },
      },
    ];
  }

  /** `languageIds[0]` là ngôn ngữ đang chọn, phần tử sau (nếu có) là ngôn ngữ mặc định */
  private pick(
    page: Page,
    languageId: number,
    languageIds: number[],
  ): PageTranslation | undefined {
    const translations = page.translations ?? [];
    return (
      translations.find((item) => item.languageId === languageId) ??
      translations.find((item) => item.languageId === languageIds[1])
    );
  }
}
