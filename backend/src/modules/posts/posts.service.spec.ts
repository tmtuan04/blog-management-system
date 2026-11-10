import { PostsService } from './posts.service';
import { PostTranslation } from './models/post-translation.model';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Language } from '../languages/models/language.model';
import { CacheService } from '../../infra/redis/cache.service';
import type { RequestLanguage } from '../../common/types/request-context';
import { isPaginated } from '../../common/utils/paginate';

describe('PostsService - UC05', () => {
  let service: PostsService;

  let postModel: {
    findAndCountAll: jest.Mock;
  };

  let categoryModel: {
    findAll: jest.Mock;
  };

  let languageModel: {
    findOne: jest.Mock;
  };

  let cacheService: {
    wrap: jest.Mock;
  };

  const vi: RequestLanguage = {
    id: 1,
    code: 'vi',
    isDefault: true,
  };

  const samplePost = {
    slug: 'bai-viet-mau',
    title: 'Bài viết mẫu',
    excerpt: 'Mô tả ngắn',
    content: '<p>Nội dung bài viết mẫu</p>',
    status: 'published',
    viewCount: 50,
    publishedAt: new Date('2026-10-01T08:00:00Z'),
    post: {
      categoryId: 1,
      thumbnail: null,
      author: {
        fullName: 'Nguyễn Văn An',
        avatar: null,
      },
    },
  };

  beforeEach(() => {
    postModel = {
      findAndCountAll: jest.fn(),
    };

    categoryModel = {
      findAll: jest.fn().mockResolvedValue([
        {
          categoryId: 1,
          languageId: 1,
          name: 'Công nghệ',
          slug: 'cong-nghe',
        },
      ]),
    };

    languageModel = {
      findOne: jest.fn(),
    };

    cacheService = {
      wrap: jest
        .fn()
        .mockImplementation(
          async (_key: string, _ttl: number, load: () => Promise<unknown>) =>
            load(),
        ),
    };

    service = new PostsService(
      postModel as unknown as typeof PostTranslation,
      categoryModel as unknown as typeof CategoryTranslation,
      languageModel as unknown as typeof Language,
      cacheService as unknown as CacheService,
    );
  });

  it('findAll chỉ truy vấn bài published theo ngôn ngữ', async () => {
    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    await service.findAll(vi, 1, 10);

    expect(postModel.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          languageId: 1,
          status: 'published',
        },
      }),
    );
  });

  it('findAll phân trang đúng', async () => {
    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 15,
    });

    const result = await service.findAll(vi, 2, 10);

    expect(postModel.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 10,
      }),
    );

    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 15,
      totalPages: 2,
    });

    expect(isPaginated(result)).toBe(true);
  });

  it('findAll trả đúng dữ liệu thẻ bài viết', async () => {
    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    const result = await service.findAll(vi);

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        slug: 'bai-viet-mau',
        title: 'Bài viết mẫu',
        viewCount: 50,
        readingMinutes: 1,
        category: {
          name: 'Công nghệ',
          slug: 'cong-nghe',
        },
        author: {
          fullName: 'Nguyễn Văn An',
          avatar: null,
        },
      }),
    );
  });

  it('findAll trả mảng rỗng nếu không có bài', async () => {
    postModel.findAndCountAll.mockResolvedValue({
      rows: [],
      count: 0,
    });

    const result = await service.findAll(vi);

    expect(result.items).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('findPopular sắp xếp theo viewCount giảm dần', async () => {
    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    const result = await service.findPopular(vi, 5);

    expect(postModel.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
        offset: 0,
        order: [
          ['viewCount', 'DESC'],
          ['publishedAt', 'DESC'],
          ['id', 'DESC'],
        ],
      }),
    );

    expect(result).toHaveLength(1);
  });

  it('findPopular sử dụng Redis cache 300 giây', async () => {
    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    await service.findPopular(vi, 5);

    expect(cacheService.wrap).toHaveBeenCalledWith(
      'cache:posts:popular:vi:5',
      300,
      expect.any(Function),
    );
  });

  it('findAll không truy vấn MySQL khi Redis đã có cache', async () => {
    cacheService.wrap.mockResolvedValueOnce({
      items: [],
      total: 15,
    });

    const result = await service.findAll(vi, 1, 10);

    expect(postModel.findAndCountAll).not.toHaveBeenCalled();
    expect(result.meta.total).toBe(15);
    expect(isPaginated(result)).toBe(true);
  });

  it('findAll sử dụng fallback danh mục', async () => {
    const en: RequestLanguage = {
      id: 2,
      code: 'en',
      isDefault: false,
    };

    languageModel.findOne.mockResolvedValue({
      id: 1,
    });

    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    const result = await service.findAll(en);

    expect(languageModel.findOne).toHaveBeenCalledWith({
      where: {
        isDefault: true,
      },
    });

    expect(result.items[0].category).toEqual({
      name: 'Công nghệ',
      slug: 'cong-nghe',
    });
  });
});
