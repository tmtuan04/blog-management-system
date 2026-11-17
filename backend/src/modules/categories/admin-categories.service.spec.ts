import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AppException } from '../../common/errors';
import { CachePrefix } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { Language } from '../languages/models/language.model';
import { Post } from '../posts/models/post.model';
import { AdminCategoriesService } from './admin-categories.service';
import { CategoryTranslation } from './models/category-translation.model';
import { Category } from './models/category.model';

describe('AdminCategoriesService', () => {
  let service: AdminCategoriesService;

  const createdAt = new Date('2026-11-16T00:00:00Z');
  const categoryModel = {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  };
  const translationModel = {
    findAll: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
  };
  const languageModel = { findAll: jest.fn() };
  const postModel = { findAll: jest.fn(), count: jest.fn() };
  const transaction = { id: 'tx' };
  const sequelize = {
    transaction: jest.fn(
      async <T>(callback: (t: unknown) => Promise<T>): Promise<T> =>
        callback(transaction),
    ),
  };
  const cache = { invalidate: jest.fn().mockResolvedValue(undefined) };

  const VI = { id: 1, code: 'vi', name: 'Tiếng Việt', isDefault: true };
  const EN = { id: 2, code: 'en', name: 'English', isDefault: false };

  const category = (id = 7) => ({
    id,
    createdAt,
    updatedAt: createdAt,
    changed: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  });

  /** Dòng category_translations kèm language, như include trả về */
  const translation = (
    language: typeof VI,
    name: string,
    slug: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    id: language.id * 100,
    categoryId: 7,
    languageId: language.id,
    name,
    slug,
    language,
    update: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

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

  /**
   * translationModel.findAll được gọi cho 3 việc: generateUniqueSlug (raw, attributes slug),
   * lấy bản dịch hiện có khi sửa, và toDtos (có include). Phân biệt theo tham số.
   */
  const mockTranslations = ({
    taken = [] as string[],
    existing = [] as unknown[],
    forDto = [] as unknown[],
  } = {}) => {
    translationModel.findAll.mockImplementation(
      (options: { include?: unknown; raw?: boolean }) => {
        if (options.raw) {
          return Promise.resolve(taken.map((slug) => ({ slug })));
        }
        return Promise.resolve(options.include ? forDto : existing);
      },
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    languageModel.findAll.mockResolvedValue([VI, EN]);
    postModel.findAll.mockResolvedValue([]);
    postModel.count.mockResolvedValue(0);
    mockTranslations();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminCategoriesService,
        { provide: getModelToken(Category), useValue: categoryModel },
        {
          provide: getModelToken(CategoryTranslation),
          useValue: translationModel,
        },
        { provide: getModelToken(Language), useValue: languageModel },
        { provide: getModelToken(Post), useValue: postModel },
        { provide: Sequelize, useValue: sequelize },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();
    service = moduleRef.get(AdminCategoriesService);
  });

  describe('list', () => {
    it('trả bản dịch (mặc định đứng đầu) và postCount, gộp truy vấn không N+1', async () => {
      categoryModel.findAndCountAll.mockResolvedValue({
        rows: [category(7), category(8)],
        count: 12,
      });
      mockTranslations({
        forDto: [
          translation(EN, 'Programming', 'programming'),
          translation(VI, 'Lập trình', 'lap-trinh'),
          translation(VI, 'Du lịch', 'du-lich', { categoryId: 8 }),
        ],
      });
      postModel.findAll.mockResolvedValue([{ categoryId: 7, total: '6' }]);

      const result = await service.list({ page: 2, limit: 2 });

      expect(result.items).toEqual([
        {
          id: 7,
          translations: [
            { code: 'vi', name: 'Lập trình', slug: 'lap-trinh' },
            { code: 'en', name: 'Programming', slug: 'programming' },
          ],
          postCount: 6,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: 8,
          translations: [{ code: 'vi', name: 'Du lịch', slug: 'du-lich' }],
          postCount: 0,
          createdAt,
          updatedAt: createdAt,
        },
      ]);
      expect(result.meta).toEqual({
        page: 2,
        limit: 2,
        total: 12,
        totalPages: 6,
      });
      expect(categoryModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, offset: 2, limit: 2 }),
      );
      expect(postModel.findAll).toHaveBeenCalledTimes(1);
      expect(postModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ group: ['categoryId'] }),
      );
    });

    it('q tìm trong tên ở mọi ngôn ngữ, escape ký tự LIKE', async () => {
      translationModel.findAll.mockResolvedValueOnce([
        { categoryId: 3 },
        { categoryId: 9 },
      ]);
      categoryModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const result = await service.list({ page: 1, limit: 10, q: '50%' });

      const [{ where }] = translationModel.findAll.mock.calls[0] as [
        { where: { name: Record<symbol, string> } },
      ];
      expect(where.name[Op.like]).toBe('%50\\%%');
      expect(categoryModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: [3, 9] } }),
      );
      expect(result.items).toEqual([]);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      categoryModel.create.mockResolvedValue(category());
      categoryModel.findByPk.mockResolvedValue(category());
    });

    it('thiếu tên ngôn ngữ mặc định → 400 ở field names.vi, không ghi', async () => {
      const error = await expectError(
        service.create({ names: { vi: '  ', en: 'Travel' } }),
        400,
        'VALIDATION_ERROR',
      );
      expect(error.errors).toEqual([
        {
          field: 'names.vi',
          message: 'Nhập tên danh mục ở ngôn ngữ mặc định (Tiếng Việt).',
        },
      ]);
      expect(categoryModel.create).not.toHaveBeenCalled();
      expect(cache.invalidate).not.toHaveBeenCalled();
    });

    it('không gửi tên ngôn ngữ mặc định → 400', async () => {
      const error = await expectError(
        service.create({ names: { en: 'Travel' } }),
        400,
        'VALIDATION_ERROR',
      );
      expect(error.errors?.[0].field).toBe('names.vi');
    });

    it('báo mọi lỗi một lần: mã không tồn tại, tên quá ngắn, quá dài, sai kiểu', async () => {
      const error = await expectError(
        service.create({
          names: {
            vi: 'A',
            en: 'x'.repeat(151),
            fr: 'Voyage',
            ja: 5 as unknown as string,
          },
        }),
        400,
        'VALIDATION_ERROR',
      );
      expect(error.errors).toEqual([
        { field: 'names.vi', message: 'Tên danh mục từ 2 đến 150 ký tự.' },
        { field: 'names.en', message: 'Tên danh mục từ 2 đến 150 ký tự.' },
        { field: 'names.fr', message: 'Ngôn ngữ “fr” không tồn tại.' },
        { field: 'names.ja', message: 'Ngôn ngữ “ja” không tồn tại.' },
      ]);
    });

    it('giá trị không phải chuỗi → 400', async () => {
      const error = await expectError(
        service.create({
          names: { vi: 'Du lịch', en: 5 as unknown as string },
        }),
        400,
        'VALIDATION_ERROR',
      );
      expect(error.errors).toEqual([
        { field: 'names.en', message: 'Tên danh mục không hợp lệ.' },
      ]);
    });

    it('tạo danh mục và bản dịch trong một transaction, bỏ tên rỗng, xóa cache', async () => {
      await service.create({ names: { vi: ' Du lịch ', en: '' } });

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(categoryModel.create).toHaveBeenCalledWith({}, { transaction });
      expect(translationModel.bulkCreate).toHaveBeenCalledWith(
        [{ categoryId: 7, languageId: 1, name: 'Du lịch', slug: 'du-lich' }],
        { transaction },
      );
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.categories);
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.posts);
    });

    it('slug trùng trong cùng ngôn ngữ thì thêm -2', async () => {
      mockTranslations({ taken: ['du-lich'] });
      await service.create({ names: { vi: 'Du lịch' } });
      expect(translationModel.bulkCreate).toHaveBeenCalledWith(
        [expect.objectContaining({ slug: 'du-lich-2' })],
        { transaction },
      );
    });
  });

  describe('update', () => {
    it('không có danh mục → 404', async () => {
      categoryModel.findByPk.mockResolvedValue(null);
      await expectError(
        service.update(99, { names: { vi: 'Du lịch' } }),
        404,
        'NOT_FOUND',
      );
    });

    it('xóa tên ngôn ngữ mặc định → 400', async () => {
      categoryModel.findByPk.mockResolvedValue(category());
      await expectError(
        service.update(7, { names: { vi: '' } }),
        400,
        'VALIDATION_ERROR',
      );
      expect(sequelize.transaction).not.toHaveBeenCalled();
    });

    it('đổi tên thì sinh lại slug (bỏ qua chính dòng đó), tên rỗng thì xóa bản dịch', async () => {
      const cat = category();
      categoryModel.findByPk.mockResolvedValue(cat);
      const vi = translation(VI, 'Lập trình', 'lap-trinh');
      const en = translation(EN, 'Programming', 'programming');
      mockTranslations({ existing: [vi, en] });

      await service.update(7, { names: { vi: 'Lập trình web', en: '' } });

      expect(vi.update).toHaveBeenCalledWith(
        { name: 'Lập trình web', slug: 'lap-trinh-web' },
        { transaction },
      );
      const slugCall = translationModel.findAll.mock.calls.find(
        ([options]: [{ raw?: boolean }]) => options.raw,
      ) as [{ where: { id: unknown } }];
      expect(slugCall[0].where.id).toBeDefined();
      expect(en.destroy).toHaveBeenCalledWith({ transaction });
      expect(cat.save).toHaveBeenCalledWith({ transaction });
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.categories);
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.posts);
    });

    it('thêm bản dịch ngôn ngữ chưa có, giữ nguyên tên không đổi', async () => {
      categoryModel.findByPk.mockResolvedValue(category());
      const vi = translation(VI, 'Du lịch', 'du-lich');
      mockTranslations({ existing: [vi] });

      await service.update(7, { names: { vi: 'Du lịch', en: 'Travel' } });

      expect(vi.update).not.toHaveBeenCalled();
      expect(translationModel.create).toHaveBeenCalledWith(
        { categoryId: 7, languageId: 2, name: 'Travel', slug: 'travel' },
        { transaction },
      );
    });

    it('ngôn ngữ không gửi thì giữ nguyên bản dịch', async () => {
      categoryModel.findByPk.mockResolvedValue(category());
      const en = translation(EN, 'Travel', 'travel');
      mockTranslations({
        existing: [translation(VI, 'Du lịch', 'du-lich'), en],
      });

      await service.update(7, { names: { vi: 'Du lịch' } });

      expect(en.update).not.toHaveBeenCalled();
      expect(en.destroy).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('không có danh mục → 404', async () => {
      categoryModel.findByPk.mockResolvedValue(null);
      await expectError(service.remove(99), 404, 'NOT_FOUND');
    });

    it('còn bài viết → 409 CATEGORY_IN_USE, không xóa', async () => {
      const cat = category();
      categoryModel.findByPk.mockResolvedValue(cat);
      postModel.count.mockResolvedValue(6);

      const error = await expectError(
        service.remove(7),
        409,
        'CATEGORY_IN_USE',
      );
      expect(error.message).toBe(
        'Danh mục đang có 6 bài viết. Chuyển các bài viết sang danh mục khác rồi thử xóa lại.',
      );
      expect(postModel.count).toHaveBeenCalledWith({
        where: { categoryId: 7 },
      });
      expect(cat.destroy).not.toHaveBeenCalled();
      expect(cache.invalidate).not.toHaveBeenCalled();
    });

    it('không còn bài thì xóa và xóa cache', async () => {
      const cat = category();
      categoryModel.findByPk.mockResolvedValue(cat);

      await service.remove(7);

      expect(cat.destroy).toHaveBeenCalled();
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.categories);
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.posts);
    });
  });
});
