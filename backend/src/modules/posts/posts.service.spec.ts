import { calculateReadingMinutes, PostsService } from './posts.service';
import { PostTranslation } from './models/post-translation.model';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { LanguagesService } from '../languages/languages.service';
import { CacheService } from '../../infra/redis/cache.service';
import type { RequestLanguage } from '../../common/types/request-context';
import { Op } from 'sequelize';
import { isPaginated } from '../../common/utils/paginate';

describe('PostsService - UC05', () => {
  let service: PostsService;

  let postModel: {
    findAndCountAll: jest.Mock;
  };

  let categoryModel: {
    findAll: jest.Mock;
  };

  let languagesService: {
    findActive: jest.Mock;
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

    languagesService = {
      findActive: jest.fn().mockResolvedValue([
        { id: 1, code: 'vi', name: 'Tiếng Việt', isDefault: true },
        { id: 2, code: 'en', name: 'English', isDefault: false },
      ]),
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
      languagesService as unknown as LanguagesService,
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

  it('findPopular dùng key cache:posts:popular, TTL 5 phút', async () => {
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

    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    const result = await service.findAll(en);

    expect(categoryModel.findAll).toHaveBeenCalledWith({
      where: {
        categoryId: { [Op.in]: [1] },
        languageId: { [Op.in]: [2, 1] },
      },
    });

    expect(result.items[0].category).toEqual({
      name: 'Công nghệ',
      slug: 'cong-nghe',
    });
  });

  it('findAll dùng key cache:posts:list theo ngôn ngữ, trang, limit', async () => {
    postModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await service.findAll(vi, 3, 20);

    expect(cacheService.wrap).toHaveBeenCalledWith(
      'cache:posts:list:vi:3:20',
      300,
      expect.any(Function),
    );
  });

  it('ngôn ngữ mặc định không gọi LanguagesService, chỉ lấy tên danh mục ở chính nó', async () => {
    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    await service.findAll(vi);

    expect(languagesService.findActive).not.toHaveBeenCalled();
    expect(categoryModel.findAll).toHaveBeenCalledWith({
      where: {
        categoryId: { [Op.in]: [1] },
        languageId: { [Op.in]: [1] },
      },
    });
  });

  it('tên danh mục ở ngôn ngữ đang chọn ưu tiên hơn ngôn ngữ mặc định', async () => {
    const en: RequestLanguage = { id: 2, code: 'en', isDefault: false };
    // Bản en đứng trước bản vi để chắc chắn kết quả không phụ thuộc thứ tự DB trả về
    categoryModel.findAll.mockResolvedValue([
      { categoryId: 1, languageId: 2, name: 'Technology', slug: 'technology' },
      { categoryId: 1, languageId: 1, name: 'Công nghệ', slug: 'cong-nghe' },
    ]);
    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    const result = await service.findAll(en);

    expect(result.items[0].category).toEqual({
      name: 'Technology',
      slug: 'technology',
    });
  });

  it('category = null khi danh mục chưa có tên ở cả hai ngôn ngữ', async () => {
    categoryModel.findAll.mockResolvedValue([]);
    postModel.findAndCountAll.mockResolvedValue({
      rows: [samplePost],
      count: 1,
    });

    const result = await service.findAll(vi);

    expect(result.items[0].category).toBeNull();
  });

  it('findCards lọc theo categoryId khi có (dùng cho UC07)', async () => {
    postModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await service.findCards(vi, {
      limit: 10,
      offset: 0,
      order: [['publishedAt', 'DESC']],
      categoryId: 7,
    });

    const options = postModel.findAndCountAll.mock.calls[0][0] as {
      include: { where: unknown }[];
    };
    expect(options.include[0].where).toEqual({ categoryId: 7 });
  });

  describe('calculateReadingMinutes', () => {
    it('tối thiểu 1 phút, kể cả nội dung rỗng', () => {
      expect(calculateReadingMinutes('')).toBe(1);
      expect(calculateReadingMinutes('<p></p>')).toBe(1);
    });

    it('200 chữ là 1 phút, 201 chữ làm tròn lên 2 phút', () => {
      expect(calculateReadingMinutes('a '.repeat(200))).toBe(1);
      expect(calculateReadingMinutes('a '.repeat(201))).toBe(2);
    });

    it('bỏ thẻ HTML và thực thể, không dính chữ hai bên thẻ', () => {
      const words = Array.from({ length: 401 }, () => '<b>chữ</b>&nbsp;');
      expect(calculateReadingMinutes('<p>' + words.join('') + '</p>')).toBe(3);
    });
  });
});
