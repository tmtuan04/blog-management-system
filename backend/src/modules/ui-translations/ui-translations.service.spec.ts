import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { AppException } from '../../common/errors';
import { CachePrefix } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { LanguagesService } from '../languages/languages.service';
import { UiTranslationQueryDto } from './dto/ui-translation-query.dto';
import { UiTranslation } from './models/ui-translation.model';
import { UiTranslationsService } from './ui-translations.service';

describe('UiTranslationsService', () => {
  let service: UiTranslationsService;

  const uiTranslationModel = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  };
  const languagesService = { findActive: jest.fn() };
  const cache = {
    // Không cache: gọi thẳng hàm load
    wrap: jest.fn((_key: string, _ttl: number, load: () => unknown) => load()),
    invalidate: jest.fn().mockResolvedValue(undefined),
  };

  const query = (overrides: Partial<UiTranslationQueryDto> = {}) =>
    Object.assign(new UiTranslationQueryDto(), overrides);

  const expectError = async (
    promise: Promise<unknown>,
    status: number,
    code: string,
  ): Promise<AppException> => {
    const error = await promise.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(status);
    expect((error as AppException).code).toBe(code);
    return error as AppException;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    languagesService.findActive.mockResolvedValue([
      { id: 1, code: 'vi', name: 'Tiếng Việt', isDefault: true },
      { id: 2, code: 'en', name: 'English', isDefault: false },
    ]);
    uiTranslationModel.count.mockResolvedValue(0);
    const moduleRef = await Test.createTestingModule({
      providers: [
        UiTranslationsService,
        { provide: getModelToken(UiTranslation), useValue: uiTranslationModel },
        { provide: LanguagesService, useValue: languagesService },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();
    service = moduleRef.get(UiTranslationsService);
  });

  describe('getPublic', () => {
    it('key thiếu ở ngôn ngữ được hỏi thì lấy giá trị của ngôn ngữ mặc định', async () => {
      uiTranslationModel.findAll.mockResolvedValue([
        { languageId: 2, key: 'menu.home', value: 'Home' },
        { languageId: 1, key: 'menu.about', value: 'Giới thiệu' },
        { languageId: 1, key: 'menu.home', value: 'Trang chủ' },
      ]);

      await expect(service.getPublic('en')).resolves.toEqual({
        'menu.home': 'Home',
        'menu.about': 'Giới thiệu',
      });
      expect(uiTranslationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { languageId: [1, 2] } }),
      );
    });

    it('đọc qua cache cache:ui:{code}, TTL 10 phút', async () => {
      uiTranslationModel.findAll.mockResolvedValue([]);
      await service.getPublic('vi');
      expect(cache.wrap).toHaveBeenCalledWith(
        'cache:ui:vi',
        600,
        expect.any(Function),
      );
      expect(uiTranslationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { languageId: [1] } }),
      );
    });

    it('mã không có hoặc đã tắt → 404, không đọc cache', async () => {
      await expectError(service.getPublic('ja'), 404, 'NOT_FOUND');
      expect(cache.wrap).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('phân trang theo key, mỗi dòng có giá trị của mọi ngôn ngữ đang hoạt động', async () => {
      uiTranslationModel.count.mockResolvedValue(120);
      uiTranslationModel.findAll
        .mockResolvedValueOnce([{ key: 'menu.about' }, { key: 'menu.home' }])
        .mockResolvedValueOnce([
          { languageId: 1, key: 'menu.home', value: 'Trang chủ' },
          { languageId: 2, key: 'menu.home', value: 'Home' },
          { languageId: 1, key: 'menu.about', value: 'Giới thiệu' },
        ]);

      const result = await service.list(query({ page: 2 }));

      expect(result.items).toEqual([
        { key: 'menu.about', values: { vi: 'Giới thiệu', en: null } },
        { key: 'menu.home', values: { vi: 'Trang chủ', en: 'Home' } },
      ]);
      expect(result.meta).toEqual({
        page: 2,
        limit: 50,
        total: 120,
        totalPages: 3,
      });
      expect(uiTranslationModel.count).toHaveBeenCalledWith(
        expect.objectContaining({ distinct: true, col: 'key' }),
      );
      expect(uiTranslationModel.findAll).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ group: ['key'], offset: 50, limit: 50 }),
      );
      // Giá trị của cả trang lấy trong một câu, không N+1
      expect(uiTranslationModel.findAll).toHaveBeenCalledTimes(2);
    });

    it('?q= tìm theo key hoặc giá trị, escape ký tự của LIKE', async () => {
      uiTranslationModel.findAll.mockResolvedValue([]);
      await service.list(query({ q: '50%_off' }));
      const { where } = uiTranslationModel.count.mock.calls[0][0] as {
        where: Record<symbol, unknown>;
      };
      const [or] = Object.getOwnPropertySymbols(where);
      expect(JSON.stringify(where[or])).toBe('[{"key":{}},{"value":{}}]');
      const conditions = where[or] as Record<string, Record<symbol, string>>[];
      const like = Object.getOwnPropertySymbols(conditions[0].key)[0];
      expect(conditions[0].key[like]).toBe('%50\\%\\_off%');
      expect(conditions[1].value[like]).toBe('%50\\%\\_off%');
    });

    it('không có key nào thì không truy vấn giá trị', async () => {
      uiTranslationModel.findAll.mockResolvedValue([]);
      const result = await service.list(query());
      expect(result.items).toEqual([]);
      expect(uiTranslationModel.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('lưu giá trị đã trim, bỏ ô trống, rồi xóa cache ui', async () => {
      const result = await service.create({
        key: 'menu.blog',
        values: { vi: '  Blog  ', en: '' },
      });

      expect(uiTranslationModel.bulkCreate).toHaveBeenCalledWith([
        { languageId: 1, key: 'menu.blog', value: 'Blog' },
      ]);
      expect(result).toEqual({
        key: 'menu.blog',
        values: { vi: 'Blog', en: null },
      });
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.ui);
    });

    it('thiếu giá trị của ngôn ngữ mặc định → 400 ở values.vi', async () => {
      const error = await expectError(
        service.create({ key: 'menu.blog', values: { en: 'Blog' } }),
        400,
        'VALIDATION_ERROR',
      );
      expect(error.errors).toEqual([
        { field: 'values.vi', message: 'Vui lòng nhập trường này.' },
      ]);
      expect(uiTranslationModel.bulkCreate).not.toHaveBeenCalled();
    });

    it('mã ngôn ngữ lạ, giá trị không phải chuỗi, quá 255 ký tự → 400 theo từng field', async () => {
      const error = await expectError(
        service.create({
          key: 'menu.blog',
          values: {
            vi: 'a'.repeat(256),
            en: 5 as unknown as string,
            ja: 'ブログ',
          },
        }),
        400,
        'VALIDATION_ERROR',
      );
      expect(error.errors?.map((e) => e.field)).toEqual([
        'values.vi',
        'values.en',
        'values.ja',
      ]);
    });

    it('key đã có → 409 kèm lỗi ở field key', async () => {
      uiTranslationModel.count.mockResolvedValue(2);
      const error = await expectError(
        service.create({ key: 'menu.home', values: { vi: 'Trang chủ' } }),
        409,
        'CONFLICT',
      );
      expect(error.errors).toEqual([
        {
          field: 'key',
          message:
            'Key “menu.home” đã có. Tìm key đó trong bảng để sửa giá trị.',
        },
      ]);
      expect(uiTranslationModel.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateValue', () => {
    beforeEach(() => {
      uiTranslationModel.count.mockResolvedValue(1);
      uiTranslationModel.findAll.mockResolvedValue([
        { languageId: 1, key: 'menu.home', value: 'Trang chủ' },
      ]);
    });

    it('ngôn ngữ không có hoặc đã tắt → 404', async () => {
      await expectError(
        service.updateValue('menu.home', 'ja', { value: 'ホーム' }),
        404,
        'NOT_FOUND',
      );
    });

    it('key không có → 404', async () => {
      uiTranslationModel.count.mockResolvedValue(0);
      await expectError(
        service.updateValue('menu.none', 'en', { value: 'x' }),
        404,
        'NOT_FOUND',
      );
    });

    it('sửa ô đã có giá trị', async () => {
      const existing = { update: jest.fn().mockResolvedValue(undefined) };
      uiTranslationModel.findOne.mockResolvedValue(existing);

      const result = await service.updateValue('menu.home', 'vi', {
        value: 'Trang nhất',
      });

      expect(existing.update).toHaveBeenCalledWith({ value: 'Trang nhất' });
      expect(result.key).toBe('menu.home');
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.ui);
    });

    it('ô chưa có giá trị thì tạo dòng mới', async () => {
      uiTranslationModel.findOne.mockResolvedValue(null);
      await service.updateValue('menu.home', 'en', { value: 'Home' });
      expect(uiTranslationModel.create).toHaveBeenCalledWith({
        key: 'menu.home',
        languageId: 2,
        value: 'Home',
      });
    });

    it('giá trị rỗng ở ngôn ngữ không mặc định thì xóa dòng', async () => {
      const result = await service.updateValue('menu.home', 'en', {
        value: '',
      });
      expect(uiTranslationModel.destroy).toHaveBeenCalledWith({
        where: { key: 'menu.home', languageId: 2 },
      });
      expect(result).toEqual({
        key: 'menu.home',
        values: { vi: 'Trang chủ', en: null },
      });
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.ui);
    });

    it('giá trị rỗng ở ngôn ngữ mặc định → 400 ở field value', async () => {
      const error = await expectError(
        service.updateValue('menu.home', 'vi', { value: '' }),
        400,
        'VALIDATION_ERROR',
      );
      expect(error.errors).toEqual([
        { field: 'value', message: 'Vui lòng nhập trường này.' },
      ]);
      expect(uiTranslationModel.destroy).not.toHaveBeenCalled();
      expect(cache.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('xóa key ở mọi ngôn ngữ rồi xóa cache ui', async () => {
      uiTranslationModel.destroy.mockResolvedValue(2);
      await service.remove('menu.home');
      expect(uiTranslationModel.destroy).toHaveBeenCalledWith({
        where: { key: 'menu.home' },
      });
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.ui);
    });

    it('key không có → 404', async () => {
      uiTranslationModel.destroy.mockResolvedValue(0);
      await expectError(service.remove('menu.none'), 404, 'NOT_FOUND');
      expect(cache.invalidate).not.toHaveBeenCalled();
    });
  });
});
