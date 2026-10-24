import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { CacheService } from '../../infra/redis/cache.service';
import { LanguagesService } from './languages.service';
import { Language } from './models/language.model';

describe('LanguagesService', () => {
  let service: LanguagesService;
  const languageModel = { findAll: jest.fn() };
  // Không cache: gọi thẳng hàm load
  const cache = {
    wrap: jest.fn((_key: string, _ttl: number, load: () => unknown) => load()),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'vi', name: 'Tiếng Việt', isDefault: true },
      { id: 2, code: 'en', name: 'English', isDefault: false },
    ]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        LanguagesService,
        { provide: getModelToken(Language), useValue: languageModel },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();
    service = moduleRef.get(LanguagesService);
  });

  it('findActive lấy ngôn ngữ đang hoạt động qua cache cache:languages:active', async () => {
    const result = await service.findActive();
    expect(cache.wrap).toHaveBeenCalledWith(
      'cache:languages:active',
      600,
      expect.any(Function),
    );
    expect(languageModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(result[0]).toEqual({
      id: 1,
      code: 'vi',
      name: 'Tiếng Việt',
      isDefault: true,
    });
  });

  it('listPublic chỉ trả code, name, isDefault', async () => {
    await expect(service.listPublic()).resolves.toEqual([
      { code: 'vi', name: 'Tiếng Việt', isDefault: true },
      { code: 'en', name: 'English', isDefault: false },
    ]);
  });

  describe('resolve', () => {
    it('lấy mã đầu tiên của Accept-Language', async () => {
      await expect(service.resolve('en-US,en;q=0.9,vi;q=0.8')).resolves.toEqual(
        {
          id: 2,
          code: 'en',
          isDefault: false,
        },
      );
    });

    it('không gửi hoặc mã không hoạt động thì dùng ngôn ngữ mặc định', async () => {
      await expect(service.resolve(undefined)).resolves.toMatchObject({
        code: 'vi',
      });
      await expect(service.resolve('fr-FR')).resolves.toMatchObject({
        code: 'vi',
      });
    });

    it('chưa có ngôn ngữ nào thì trả null', async () => {
      languageModel.findAll.mockResolvedValue([]);
      await expect(service.resolve('vi')).resolves.toBeNull();
    });
  });
});
