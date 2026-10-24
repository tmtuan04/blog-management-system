import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RequestLanguage } from '../../common/types/request-context';
import { CacheTtl, RedisKeys } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { LanguageResponseDto } from './dto/language-response.dto';
import { Language } from './models/language.model';

export interface ActiveLanguage extends RequestLanguage {
  name: string;
}

@Injectable()
export class LanguagesService {
  constructor(
    @InjectModel(Language) private readonly languageModel: typeof Language,
    private readonly cache: CacheService,
  ) {}

  /** Ngôn ngữ đang hoạt động, mặc định đứng đầu. Cache 10 phút */
  findActive(): Promise<ActiveLanguage[]> {
    return this.cache.wrap(
      RedisKeys.languagesActive(),
      CacheTtl.languages,
      async () => {
        const rows = await this.languageModel.findAll({
          where: { isActive: true },
          order: [
            ['isDefault', 'DESC'],
            ['id', 'ASC'],
          ],
        });
        return rows.map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          isDefault: row.isDefault,
        }));
      },
    );
  }

  /** GET /languages (UC09, UC16) */
  async listPublic(): Promise<LanguageResponseDto[]> {
    const languages = await this.findActive();
    return languages.map(({ code, name, isDefault }) => ({
      code,
      name,
      isDefault,
    }));
  }

  /**
   * Ngôn ngữ của request theo header Accept-Language: lấy mã đầu tiên
   * (`en-US,en;q=0.9` → `en`). Không có hoặc không hoạt động thì dùng ngôn ngữ mặc định.
   */
  async resolve(acceptLanguage?: string): Promise<RequestLanguage | null> {
    const languages = await this.findActive();
    const code = acceptLanguage
      ?.split(',')[0]
      ?.split(';')[0]
      ?.split('-')[0]
      ?.trim()
      .toLowerCase();
    const found =
      languages.find((language) => language.code === code) ??
      languages.find((language) => language.isDefault);
    return found
      ? { id: found.id, code: found.code, isDefault: found.isDefault }
      : null;
  }
}
