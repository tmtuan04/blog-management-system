import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { AppException } from '../../common/errors';
import { CachePrefix } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { UploadService } from '../../infra/upload/upload.service';
import { Category } from '../categories/models/category.model';
import { Language } from '../languages/models/language.model';
import { AdminPostsService } from './admin-posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CATEGORY_MESSAGE, THUMBNAIL_MESSAGE } from './dto/post-fields';
import { PostTranslation } from './models/post-translation.model';
import { Post } from './models/post.model';

describe('AdminPostsService', () => {
  let service: AdminPostsService;

  const postModel = {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  };
  const translationModel = {
    create: jest.fn(),
    findAll: jest.fn(),
  };
  const languageModel = { findOne: jest.fn() };
  const categoryModel = { findByPk: jest.fn() };
  const sequelize = {
    escape: jest.fn((value: unknown) =>
      typeof value === 'string' ? `'${value}'` : String(value),
    ),
    transaction: jest.fn(
      async <T>(callback: (t: unknown) => Promise<T>): Promise<T> =>
        callback({}),
    ),
  };
  const cache = { invalidate: jest.fn().mockResolvedValue(undefined) };
  const upload = {
    exists: jest.fn().mockResolvedValue(true),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const now = new Date('2026-11-01T10:00:00.000Z');
  const later = new Date('2026-11-02T10:00:00.000Z');

  const ownedPost = (overrides: Record<string, unknown> = {}) => {
    const vi = {
      languageId: 1,
      title: 'Bai viet tieng Viet',
      slug: 'bai-viet-tieng-viet',
      excerpt: 'Tom tat',
      content: '<p>Noi dung</p>',
      status: 'published' as const,
      viewCount: 3,
      publishedAt: now,
      updatedAt: later,
      language: { id: 1, code: 'vi' },
    };
    const en = {
      languageId: 2,
      title: 'English post',
      slug: 'english-post',
      excerpt: null,
      content: '<p>Content</p>',
      status: 'draft' as const,
      viewCount: 0,
      publishedAt: null,
      updatedAt: now,
      language: { id: 2, code: 'en' },
    };
    return {
      id: 10,
      userId: 1,
      languageId: 1,
      categoryId: 5,
      thumbnail: 'uploads/images/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
      createdAt: now,
      updatedAt: now,
      language: { id: 1, code: 'vi' },
      translations: [en, vi],
      category: {
        translations: [
          { name: 'Du lịch', language: { id: 1, isDefault: true } },
          { name: 'Travel', language: { id: 2, isDefault: false } },
        ],
      },
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  };

  const createDto = (
    overrides: Partial<CreatePostDto> = {},
  ): CreatePostDto => ({
    languageCode: 'vi',
    categoryId: 5,
    translation: {
      title: 'Bai viet moi day',
      excerpt: 'Tom tat',
      content: '<p>Noi dung hop le</p>',
      status: 'draft',
    },
    ...overrides,
  });

  const errorOf = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error('phải ném lỗi');
      },
      (error: unknown) => error as AppException,
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    translationModel.findAll.mockResolvedValue([]);
    cache.invalidate.mockResolvedValue(undefined);
    upload.exists.mockResolvedValue(true);
    upload.remove.mockResolvedValue(undefined);
    sequelize.transaction.mockImplementation(
      async <T>(callback: (t: unknown) => Promise<T>): Promise<T> =>
        callback({}),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminPostsService,
        { provide: getModelToken(Post), useValue: postModel },
        { provide: getModelToken(PostTranslation), useValue: translationModel },
        { provide: getModelToken(Language), useValue: languageModel },
        { provide: getModelToken(Category), useValue: categoryModel },
        { provide: Sequelize, useValue: sequelize },
        { provide: CacheService, useValue: cache },
        { provide: UploadService, useValue: upload },
      ],
    }).compile();
    service = moduleRef.get(AdminPostsService);
  });

  describe('list', () => {
    it('trả trang rỗng khi không có bài', async () => {
      postModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const result = await service.list(1, { page: 1, limit: 10 });

      expect(postModel.findAll).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('giữ thứ tự id từ trang đã sort và map DTO danh sách', async () => {
      const first = ownedPost({ id: 2, updatedAt: later });
      const second = ownedPost({
        id: 1,
        updatedAt: now,
        translations: [
          {
            languageId: 1,
            title: 'Bai cu',
            slug: 'bai-cu',
            excerpt: null,
            content: '<p>x</p>',
            status: 'draft',
            viewCount: 0,
            publishedAt: null,
            updatedAt: now,
            language: { id: 1, code: 'vi' },
          },
        ],
      });
      // findAll trả ngược thứ tự để kiểm tra map lại theo ids
      postModel.findAndCountAll.mockResolvedValue({
        rows: [{ id: 2 }, { id: 1 }],
        count: 2,
      });
      postModel.findAll.mockResolvedValue([second, first]);

      const result = await service.list(1, {
        page: 1,
        limit: 10,
        categoryId: 5,
        status: 'published',
        language: 'en',
        q: '100%',
      });

      expect(sequelize.escape).toHaveBeenCalledWith('published');
      expect(sequelize.escape).toHaveBeenCalledWith('en');
      expect(sequelize.escape).toHaveBeenCalledWith('%100\\%%');
      expect(result.items.map((item) => item.id)).toEqual([2, 1]);
      expect(result.items[0]).toMatchObject({
        id: 2,
        title: 'Bai viet tieng Viet',
        languageCode: 'vi',
        category: { id: 5, name: 'Du lịch' },
        translations: [
          { code: 'vi', status: 'published' },
          { code: 'en', status: 'draft' },
        ],
      });
      expect(result.items[0].updatedAt).toEqual(later);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findOne', () => {
    it('404 khi không có bài', async () => {
      postModel.findByPk.mockResolvedValue(null);
      const error = await errorOf(service.findOne(1, 99));
      expect(error.getStatus()).toBe(404);
    });

    it('403 khi bài của người khác', async () => {
      postModel.findByPk.mockResolvedValue(ownedPost({ userId: 2 }));
      const error = await errorOf(service.findOne(1, 10));
      expect(error.getStatus()).toBe(403);
      expect(error.message).toBe('Bạn chỉ quản lý được bài viết của mình');
    });

    it('trả chi tiết, bản gốc đứng đầu', async () => {
      postModel.findByPk.mockResolvedValue(ownedPost());
      const detail = await service.findOne(1, 10);
      expect(detail.translations.map((t) => t.code)).toEqual(['vi', 'en']);
      expect(detail.translations[0].isOriginal).toBe(true);
      expect(detail.category.name).toBe('Du lịch');
      expect(detail.languageCode).toBe('vi');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      languageModel.findOne.mockResolvedValue({
        id: 1,
        code: 'vi',
        isActive: true,
      });
      categoryModel.findByPk.mockResolvedValue({ id: 5 });
      postModel.create.mockResolvedValue({ id: 10 });
      translationModel.create.mockResolvedValue({});
      postModel.findByPk.mockResolvedValue(ownedPost());
    });

    it('ngôn ngữ không hoạt động → 400 field languageCode', async () => {
      languageModel.findOne.mockResolvedValue(null);
      const error = await errorOf(service.create(1, createDto()));
      expect(error.getStatus()).toBe(400);
      expect(error.errors).toEqual([
        {
          field: 'languageCode',
          message: 'Ngôn ngữ không tồn tại hoặc đã tắt.',
        },
      ]);
      expect(sequelize.transaction).not.toHaveBeenCalled();
    });

    it('danh mục không tồn tại → 400 field categoryId', async () => {
      categoryModel.findByPk.mockResolvedValue(null);
      const error = await errorOf(service.create(1, createDto()));
      expect(error.getStatus()).toBe(400);
      expect(error.errors).toEqual([
        { field: 'categoryId', message: CATEGORY_MESSAGE },
      ]);
    });

    it('thumbnail không có trên đĩa → 400 field thumbnail', async () => {
      upload.exists.mockResolvedValue(false);
      const error = await errorOf(
        service.create(
          1,
          createDto({
            thumbnail:
              'uploads/images/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
          }),
        ),
      );
      expect(error.getStatus()).toBe(400);
      expect(error.errors).toEqual([
        { field: 'thumbnail', message: THUMBNAIL_MESSAGE },
      ]);
    });

    it('nội dung rỗng sau sanitize → 400 field translation.content', async () => {
      const error = await errorOf(
        service.create(
          1,
          createDto({
            translation: {
              title: 'Bai viet moi day',
              content: '<script>alert(1)</script>',
              status: 'draft',
            },
          }),
        ),
      );
      expect(error.getStatus()).toBe(400);
      expect(error.errors).toEqual([
        { field: 'translation.content', message: 'Nhập nội dung bài viết.' },
      ]);
    });

    it('tạo bài + bản gốc trong transaction, xóa cache, trả chi tiết', async () => {
      const detail = await service.create(
        1,
        createDto({
          thumbnail: 'uploads/images/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
          translation: {
            title: 'Bai viet moi day',
            excerpt: '',
            content: '<p>Noi dung</p><script>x</script>',
            status: 'published',
          },
        }),
      );

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(postModel.create).toHaveBeenCalledWith(
        {
          userId: 1,
          languageId: 1,
          categoryId: 5,
          thumbnail: 'uploads/images/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
        },
        { transaction: {} },
      );
      expect(translationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 10,
          languageId: 1,
          title: 'Bai viet moi day',
          slug: 'bai-viet-moi-day',
          excerpt: null,
          content: '<p>Noi dung</p>',
          status: 'published',
          publishedAt: expect.any(Date),
        }),
        { transaction: {} },
      );
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.posts);
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.categories);
      expect(detail.id).toBe(10);
    });
  });

  describe('update', () => {
    it('đổi danh mục và thumbnail, xóa file cũ sau khi lưu', async () => {
      const post = ownedPost({
        thumbnail: 'uploads/images/oldddddd-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
      });
      postModel.findByPk
        .mockResolvedValueOnce(post)
        .mockResolvedValueOnce(
          ownedPost({
            categoryId: 8,
            thumbnail:
              'uploads/images/newwwwww-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
          }),
        );
      categoryModel.findByPk.mockResolvedValue({ id: 8 });

      await service.update(1, 10, {
        categoryId: 8,
        thumbnail: 'uploads/images/newwwwww-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
      });

      expect(post.categoryId).toBe(8);
      expect(post.thumbnail).toBe(
        'uploads/images/newwwwww-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
      );
      expect(post.save).toHaveBeenCalled();
      expect(upload.remove).toHaveBeenCalledWith(
        'uploads/images/oldddddd-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
      );
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.posts);
    });

    it('thumbnail null thì bỏ ảnh và xóa file cũ', async () => {
      const post = ownedPost({
        thumbnail: 'uploads/images/oldddddd-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
      });
      postModel.findByPk
        .mockResolvedValueOnce(post)
        .mockResolvedValueOnce(ownedPost({ thumbnail: null }));

      await service.update(1, 10, { thumbnail: null });

      expect(post.thumbnail).toBeNull();
      expect(upload.exists).not.toHaveBeenCalled();
      expect(upload.remove).toHaveBeenCalledWith(
        'uploads/images/oldddddd-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
      );
    });
  });

  describe('remove', () => {
    it('xóa bài, thumbnail và cache', async () => {
      const post = ownedPost();
      postModel.findByPk.mockResolvedValue(post);

      await service.remove(1, 10);

      expect(post.destroy).toHaveBeenCalled();
      expect(upload.remove).toHaveBeenCalledWith(post.thumbnail);
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.posts);
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.categories);
    });

    it('403 khi xóa bài của người khác', async () => {
      postModel.findByPk.mockResolvedValue(ownedPost({ userId: 99 }));
      const error = await errorOf(service.remove(1, 10));
      expect(error.getStatus()).toBe(403);
      expect(upload.remove).not.toHaveBeenCalled();
    });
  });
});
