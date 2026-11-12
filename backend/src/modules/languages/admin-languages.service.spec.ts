import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { AppException } from '../../common/errors';
import { CachePrefix } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { PostTranslation } from '../posts/models/post-translation.model';
import { UiTranslation } from '../ui-translations/models/ui-translation.model';
import { AdminLanguagesService } from './admin-languages.service';
import { Language } from './models/language.model';

describe('AdminLanguagesService', () => {
  let service: AdminLanguagesService;

  const languageModel = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const uiTranslationModel = { findAll: jest.fn(), bulkCreate: jest.fn() };
  const postTranslationModel = { findAll: jest.fn(), count: jest.fn() };
  const transaction = { id: 'tx' };
  const sequelize = {
    transaction: jest.fn(
      async <T>(callback: (t: unknown) => Promise<T>): Promise<T> =>
        callback(transaction),
    ),
  };
  const cache = { invalidate: jest.fn().mockResolvedValue(undefined) };

  /** Dòng languages giả: update() ghi đè field như Sequelize */
  const row = (overrides: Record<string, unknown> = {}) => {
    const language: Record<string, unknown> = {
      id: 2,
      code: 'en',
      name: 'English',
      isDefault: false,
      isActive: true,
      destroy: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    language.update = jest.fn((values: Record<string, unknown>) => {
      Object.assign(language, values);
      return Promise.resolve(language);
    });
    return language as Record<string, unknown> & {
      update: jest.Mock;
      destroy: jest.Mock;
    };
  };

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
    postTranslationModel.count.mockResolvedValue(0);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminLanguagesService,
        { provide: getModelToken(Language), useValue: languageModel },
        { provide: getModelToken(UiTranslation), useValue: uiTranslationModel },
        {
          provide: getModelToken(PostTranslation),
          useValue: postTranslationModel,
        },
        { provide: Sequelize, useValue: sequelize },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();
    service = moduleRef.get(AdminLanguagesService);
  });

  describe('list', () => {
    it('trả mọi ngôn ngữ kèm postTranslationCount, đếm bằng một câu GROUP BY', async () => {
      languageModel.findAll.mockResolvedValue([
        row({ id: 1, code: 'vi', name: 'Tiếng Việt', isDefault: true }),
        row(),
        row({ id: 3, code: 'ja', name: '日本語', isActive: false }),
      ]);
      postTranslationModel.findAll.mockResolvedValue([
        { languageId: 1, total: '14' },
        { languageId: 2, total: 6 },
      ]);

      await expect(service.list()).resolves.toEqual([
        {
          id: 1,
          code: 'vi',
          name: 'Tiếng Việt',
          isDefault: true,
          isActive: true,
          postTranslationCount: 14,
        },
        {
          id: 2,
          code: 'en',
          name: 'English',
          isDefault: false,
          isActive: true,
          postTranslationCount: 6,
        },
        {
          id: 3,
          code: 'ja',
          name: '日本語',
          isDefault: false,
          isActive: false,
          postTranslationCount: 0,
        },
      ]);
      expect(postTranslationModel.findAll).toHaveBeenCalledTimes(1);
      expect(postTranslationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ group: ['languageId'] }),
      );
    });
  });

  describe('create', () => {
    it('mã đã có → 409 kèm lỗi ở field code, không ghi gì', async () => {
      languageModel.findOne.mockResolvedValue(row());
      const error = await expectError(
        service.create({ code: 'en', name: 'English' }),
        409,
        'CONFLICT',
      );
      expect(error.errors).toEqual([
        { field: 'code', message: 'Mã “en” đã có trong danh sách.' },
      ]);
      expect(languageModel.create).not.toHaveBeenCalled();
      expect(cache.invalidate).not.toHaveBeenCalled();
    });

    it('tạo ngôn ngữ và sao chép UI translation của ngôn ngữ mặc định trong một transaction', async () => {
      languageModel.findOne
        .mockResolvedValueOnce(null) // kiểm tra trùng mã
        .mockResolvedValueOnce(row({ id: 1, code: 'vi', isDefault: true }));
      languageModel.create.mockResolvedValue(
        row({ id: 5, code: 'fr', name: 'Français' }),
      );
      uiTranslationModel.findAll.mockResolvedValue([
        { key: 'menu.home', value: 'Trang chủ' },
        { key: 'menu.about', value: 'Giới thiệu' },
      ]);

      const result = await service.create({ code: 'fr', name: 'Français' });

      expect(result).toEqual({
        id: 5,
        code: 'fr',
        name: 'Français',
        isDefault: false,
        isActive: true,
        postTranslationCount: 0,
      });
      expect(languageModel.create).toHaveBeenCalledWith(
        { code: 'fr', name: 'Français', isActive: true },
        { transaction },
      );
      expect(uiTranslationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { languageId: 1 }, transaction }),
      );
      expect(uiTranslationModel.bulkCreate).toHaveBeenCalledWith(
        [
          { languageId: 5, key: 'menu.home', value: 'Trang chủ' },
          { languageId: 5, key: 'menu.about', value: 'Giới thiệu' },
        ],
        { transaction },
      );
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.all);
    });

    it('isActive = false thì tạo ngôn ngữ ở trạng thái tắt', async () => {
      languageModel.findOne.mockResolvedValue(null);
      languageModel.create.mockResolvedValue(
        row({ id: 5, code: 'fr', isActive: false }),
      );
      await service.create({ code: 'fr', name: 'Français', isActive: false });
      expect(languageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
        { transaction },
      );
    });
  });

  describe('update', () => {
    it('không có ngôn ngữ → 404', async () => {
      languageModel.findByPk.mockResolvedValue(null);
      await expectError(service.update(99, { name: 'X' }), 404, 'NOT_FOUND');
    });

    it('tắt ngôn ngữ mặc định → 400, không ghi', async () => {
      const language = row({ id: 1, code: 'vi', isDefault: true });
      languageModel.findByPk.mockResolvedValue(language);
      await expectError(
        service.update(1, { isActive: false }),
        400,
        'BAD_REQUEST',
      );
      expect(language.update).not.toHaveBeenCalled();
      expect(cache.invalidate).not.toHaveBeenCalled();
    });

    it('đổi tên, tắt ngôn ngữ thường rồi xóa toàn bộ cache', async () => {
      const language = row();
      languageModel.findByPk.mockResolvedValue(language);
      postTranslationModel.count.mockResolvedValue(6);

      const result = await service.update(2, {
        name: 'Tiếng Anh',
        isActive: false,
      });

      expect(language.update).toHaveBeenCalledWith({
        name: 'Tiếng Anh',
        isActive: false,
      });
      expect(result).toMatchObject({
        name: 'Tiếng Anh',
        isActive: false,
        postTranslationCount: 6,
      });
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.all);
    });

    it('trường không gửi thì giữ nguyên', async () => {
      const language = row();
      languageModel.findByPk.mockResolvedValue(language);
      await service.update(2, { name: 'Tiếng Anh' });
      expect(language.update).toHaveBeenCalledWith({ name: 'Tiếng Anh' });
    });
  });

  describe('setDefault', () => {
    it('ngôn ngữ đang tắt → 400', async () => {
      languageModel.findByPk.mockResolvedValue(row({ isActive: false }));
      await expectError(service.setDefault(2), 400, 'BAD_REQUEST');
      expect(languageModel.update).not.toHaveBeenCalled();
    });

    it('bỏ mặc định cũ và đặt mặc định mới trong cùng transaction', async () => {
      const language = row();
      languageModel.findByPk.mockResolvedValue(language);

      const result = await service.setDefault(2);

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(languageModel.update).toHaveBeenCalledWith(
        { isDefault: false },
        { where: { isDefault: true }, transaction },
      );
      expect(language.update).toHaveBeenCalledWith(
        { isDefault: true },
        { transaction },
      );
      expect(result.isDefault).toBe(true);
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.all);
    });

    it('đã là mặc định thì không ghi lại', async () => {
      languageModel.findByPk.mockResolvedValue(
        row({ id: 1, code: 'vi', isDefault: true }),
      );
      const result = await service.setDefault(1);
      expect(result.isDefault).toBe(true);
      expect(sequelize.transaction).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('ngôn ngữ mặc định → 400', async () => {
      const language = row({ id: 1, code: 'vi', isDefault: true });
      languageModel.findByPk.mockResolvedValue(language);
      await expectError(service.remove(1), 400, 'BAD_REQUEST');
      expect(language.destroy).not.toHaveBeenCalled();
    });

    it('đang có bản dịch bài viết → 409 LANGUAGE_IN_USE', async () => {
      const language = row();
      languageModel.findByPk.mockResolvedValue(language);
      postTranslationModel.count.mockResolvedValue(6);
      const error = await expectError(
        service.remove(2),
        409,
        'LANGUAGE_IN_USE',
      );
      expect(error.message).toContain('6 bản dịch bài viết');
      expect(postTranslationModel.count).toHaveBeenCalledWith({
        where: { languageId: 2 },
      });
      expect(language.destroy).not.toHaveBeenCalled();
    });

    it('xóa được thì xóa toàn bộ cache', async () => {
      const language = row({ id: 3, code: 'ja' });
      languageModel.findByPk.mockResolvedValue(language);
      await service.remove(3);
      expect(language.destroy).toHaveBeenCalledTimes(1);
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.all);
    });

    it('không có ngôn ngữ → 404', async () => {
      languageModel.findByPk.mockResolvedValue(null);
      await expectError(service.remove(99), 404, 'NOT_FOUND');
    });
  });
});
