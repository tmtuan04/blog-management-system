import { AppException } from '../../common/errors';
import type { RequestLanguage } from '../../common/types/request-context';
import { isPaginated } from '../../common/utils/paginate';
import { CacheTtl, RedisKeys } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { LanguagesService } from '../languages/languages.service';
import { PostTranslation } from '../posts/models/post-translation.model';
import { PostsService } from '../posts/posts.service';

import { CategoriesService } from './categories.service';
import { CategoryTranslation } from './models/category-translation.model';
import { Category } from './models/category.model';

describe('CategoriesService - UC07', () => {
  let service: CategoriesService;

  let categoryModel: {
    findAll: jest.Mock;
  };

  let translationModel: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
  };

  let postTranslationModel: {
    findAll: jest.Mock;
  };

  let languagesService: {
    findActive: jest.Mock;
  };

  let postsService: {
    findCards: jest.Mock;
  };

  let cacheService: {
    wrap: jest.Mock;
  };

  const vi: RequestLanguage = {
    id: 1,
    code: 'vi',
    isDefault: true,
  };

  const en: RequestLanguage = {
    id: 2,
    code: 'en',
    isDefault: false,
  };

  const translations = [
    {
      categoryId: 1,
      languageId: 1,
      name: 'Lập trình',
      slug: 'lap-trinh',
    },
    {
      categoryId: 1,
      languageId: 2,
      name: 'Programming',
      slug: 'programming',
    },
    {
      categoryId: 2,
      languageId: 1,
      name: 'Công nghệ',
      slug: 'cong-nghe',
    },
    {
      categoryId: 2,
      languageId: 2,
      name: 'Technology',
      slug: 'technology',
    },
  ];

  const sampleCard = {
    slug: 'bai-viet-mau',
    title: 'Bài viết mẫu',
    excerpt: 'Mô tả ngắn',
    thumbnail: null,
    category: {
      name: 'Lập trình',
      slug: 'lap-trinh',
    },
    author: {
      fullName: 'Nguyễn Văn An',
      avatar: null,
    },
    publishedAt: '2026-10-01T08:00:00.000Z',
    viewCount: 50,
    readingMinutes: 1,
  };

  beforeEach(() => {
    categoryModel = {
      findAll: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    };

    translationModel = {
      findAll: jest.fn().mockResolvedValue(translations),
      findOne: jest.fn().mockResolvedValue({
        categoryId: 1,
      }),
      count: jest.fn().mockResolvedValue(0),
    };

    postTranslationModel = {
      findAll: jest.fn().mockResolvedValue([
        { categoryId: 1, postCount: '5' },
        { categoryId: 2, postCount: '2' },
      ]),
    };

    languagesService = {
      findActive: jest.fn().mockResolvedValue([
        {
          id: 1,
          code: 'vi',
          name: 'Tiếng Việt',
          isDefault: true,
        },
        {
          id: 2,
          code: 'en',
          name: 'English',
          isDefault: false,
        },
      ]),
    };

    postsService = {
      findCards: jest.fn().mockResolvedValue({
        items: [sampleCard],
        total: 5,
      }),
    };

    cacheService = {
      wrap: jest
        .fn()
        .mockImplementation(
          async (_key: string, _ttl: number, loader: () => Promise<unknown>) =>
            loader(),
        ),
    };

    service = new CategoriesService(
      categoryModel as unknown as typeof Category,
      translationModel as unknown as typeof CategoryTranslation,
      postTranslationModel as unknown as typeof PostTranslation,
      languagesService as unknown as LanguagesService,
      postsService as unknown as PostsService,
      cacheService as unknown as CacheService,
    );
  });

  it('1. Lấy danh sách danh mục và postCount', async () => {
    const result = await service.findAll(vi);

    expect(result).toEqual([
      {
        id: 1,
        name: 'Lập trình',
        slug: 'lap-trinh',
        postCount: 5,
      },
      {
        id: 2,
        name: 'Công nghệ',
        slug: 'cong-nghe',
        postCount: 2,
      },
    ]);

    expect(postTranslationModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          languageId: vi.id,
          status: 'published',
        },
      }),
    );
  });

  it('2. Fallback ngôn ngữ mặc định', async () => {
    translationModel.findAll.mockResolvedValue([
      translations[0],
      translations[1],
      translations[2],
    ]);

    const result = await service.findAll(en);

    expect(result[0].name).toBe('Programming');
    expect(result[0].slug).toBe('programming');

    expect(result[1].name).toBe('Công nghệ');
    expect(result[1].slug).toBe('cong-nghe');
  });

  it('3. Danh sách rỗng khi không có danh mục', async () => {
    categoryModel.findAll.mockResolvedValue([]);

    const result = await service.findAll(vi);

    expect(result).toEqual([]);
    expect(postTranslationModel.findAll).not.toHaveBeenCalled();
  });

  it('4. Lấy chi tiết danh mục và translations', async () => {
    const result = await service.findBySlug(vi, 'lap-trinh');

    expect(result).toEqual({
      id: 1,
      name: 'Lập trình',
      slug: 'lap-trinh',
      postCount: 5,
      translations: [
        { code: 'vi', slug: 'lap-trinh' },
        { code: 'en', slug: 'programming' },
      ],
    });
  });

  it('5. Slug không tồn tại trả NOT_FOUND', async () => {
    translationModel.findOne.mockResolvedValue(null);

    await expect(service.findBySlug(vi, 'khong-ton-tai')).rejects.toMatchObject(
      {
        code: 'NOT_FOUND',
      },
    );
  });

  it('6. Fallback slug khi thiếu bản dịch', async () => {
    translationModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ categoryId: 1 });

    translationModel.findAll.mockResolvedValue([translations[0]]);

    const result = await service.findBySlug(en, 'lap-trinh');

    expect(result.id).toBe(1);
    expect(result.name).toBe('Lập trình');
    expect(result.slug).toBe('lap-trinh');

    expect(translationModel.count).toHaveBeenCalledWith({
      where: {
        categoryId: 1,
        languageId: en.id,
      },
    });
  });

  it('7. Không fallback slug khi đã có bản dịch', async () => {
    translationModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ categoryId: 1 });

    translationModel.count.mockResolvedValue(1);

    await expect(service.findBySlug(en, 'lap-trinh')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('8. Lấy bài theo danh mục và phân trang', async () => {
    const result = await service.findPosts(vi, 'lap-trinh', 2, 2);

    expect(postsService.findCards).toHaveBeenCalledWith(
      vi,
      expect.objectContaining({
        categoryId: 1,
        limit: 2,
        offset: 2,
      }),
    );

    expect(isPaginated(result)).toBe(true);

    expect(result.meta).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });

    expect(result.items).toEqual([sampleCard]);
  });

  it('9. Sử dụng đúng Redis Keys và TTL', async () => {
    await service.findAll(vi);
    await service.findBySlug(vi, 'lap-trinh');
    await service.findPosts(vi, 'lap-trinh', 1, 10);

    expect(cacheService.wrap).toHaveBeenCalledWith(
      RedisKeys.categoriesList('vi'),
      CacheTtl.categories,
      expect.any(Function),
    );

    expect(cacheService.wrap).toHaveBeenCalledWith(
      RedisKeys.categoryDetail('vi', 'lap-trinh'),
      CacheTtl.categories,
      expect.any(Function),
    );

    expect(cacheService.wrap).toHaveBeenCalledWith(
      RedisKeys.categoryPosts('vi', 1, 1, 10),
      CacheTtl.posts,
      expect.any(Function),
    );
  });

  it('10. Cache hit không truy vấn lại database', async () => {
    const cached = [
      {
        id: 1,
        name: 'Lập trình',
        slug: 'lap-trinh',
        postCount: 5,
      },
    ];

    cacheService.wrap.mockResolvedValue(cached);

    const result = await service.findAll(vi);

    expect(result).toEqual(cached);
    expect(categoryModel.findAll).not.toHaveBeenCalled();
    expect(translationModel.findAll).not.toHaveBeenCalled();
    expect(postTranslationModel.findAll).not.toHaveBeenCalled();
  });
});
