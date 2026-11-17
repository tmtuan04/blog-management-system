import {
  calculateReadingMinutes,
  PostsService,
  RELATED_LIMIT,
  toBooleanSearchTerm,
} from './posts.service';
import { PostTranslation } from './models/post-translation.model';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Comment } from '../comments/models/comment.model';
import { LanguagesService } from '../languages/languages.service';
import { CacheService } from '../../infra/redis/cache.service';
import { RedisService } from '../../infra/redis/redis.service';
import { AppException } from '../../common/errors';
import { CacheTtl } from '../../common/utils/redis-keys';
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
      {} as typeof Comment,
      languagesService as unknown as LanguagesService,
      cacheService as unknown as CacheService,
      {} as RedisService,
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

describe('PostsService - UC06', () => {
  let service: PostsService;
  let postModel: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    findAndCountAll: jest.Mock;
    increment: jest.Mock;
  };
  let categoryModel: { findAll: jest.Mock };
  let commentModel: { count: jest.Mock };
  let redisClient: { set: jest.Mock };

  const vi: RequestLanguage = { id: 1, code: 'vi', isDefault: true };
  const en: RequestLanguage = { id: 2, code: 'en', isDefault: false };
  const ip = '1.2.3.4';

  const translation = {
    id: 10,
    slug: 'huong-dan-angular',
    title: 'Hướng dẫn Angular',
    excerpt: null,
    content: '<p>Nội dung</p>',
    viewCount: 5,
    publishedAt: new Date('2026-10-12T00:00:00Z'),
    post: {
      id: 3,
      userId: 7,
      categoryId: 1,
      thumbnail: 'uploads/images/a.webp',
      author: { fullName: 'Nguyễn Văn An', avatar: null },
    },
  };

  beforeEach(() => {
    postModel = {
      findOne: jest.fn().mockResolvedValue(translation),
      findAll: jest.fn().mockResolvedValue([
        { languageId: 2, slug: 'angular-tutorial' },
        { languageId: 1, slug: 'huong-dan-angular' },
      ]),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
      increment: jest.fn().mockResolvedValue(undefined),
    };
    categoryModel = {
      findAll: jest.fn().mockResolvedValue([
        {
          categoryId: 1,
          languageId: 1,
          name: 'Lập trình',
          slug: 'lap-trinh',
        },
      ]),
    };
    commentModel = { count: jest.fn().mockResolvedValue(4) };
    redisClient = { set: jest.fn().mockResolvedValue('OK') };

    service = new PostsService(
      postModel as unknown as typeof PostTranslation,
      categoryModel as unknown as typeof CategoryTranslation,
      commentModel as unknown as typeof Comment,
      {
        findActive: jest.fn().mockResolvedValue([
          { id: 1, code: 'vi', name: 'Tiếng Việt', isDefault: true },
          { id: 2, code: 'en', name: 'English', isDefault: false },
        ]),
      } as unknown as LanguagesService,
      { wrap: jest.fn() } as unknown as CacheService,
      { client: redisClient } as unknown as RedisService,
    );
  });

  describe('findBySlug', () => {
    it('chỉ tìm bản dịch published có slug ở ngôn ngữ đang chọn', async () => {
      await service.findBySlug(vi, 'huong-dan-angular', ip);

      expect(postModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            slug: 'huong-dan-angular',
            languageId: 1,
            status: 'published',
          },
        }),
      );
    });

    it('không có hoặc chưa đăng thì 404, không tính lượt xem', async () => {
      postModel.findOne.mockResolvedValue(null);

      const error = await service
        .findBySlug(vi, 'khong-co', ip)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getStatus()).toBe(404);
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('trả đủ dữ liệu chi tiết', async () => {
      const result = await service.findBySlug(vi, 'huong-dan-angular', ip);

      expect(result).toEqual({
        translationId: 10,
        slug: 'huong-dan-angular',
        title: 'Hướng dẫn Angular',
        excerpt: null,
        content: '<p>Nội dung</p>',
        thumbnail: 'uploads/images/a.webp',
        category: { name: 'Lập trình', slug: 'lap-trinh' },
        author: { fullName: 'Nguyễn Văn An', avatar: null },
        publishedAt: '2026-10-12T00:00:00.000Z',
        viewCount: 6,
        readingMinutes: 1,
        commentCount: 4,
        availableLanguages: [
          { code: 'vi', name: 'Tiếng Việt', slug: 'huong-dan-angular' },
          { code: 'en', name: 'English', slug: 'angular-tutorial' },
        ],
        canDeleteComments: false,
      });
      expect(commentModel.count).toHaveBeenCalledWith({
        where: { postTranslationId: 10 },
      });
    });

    it('availableLanguages chỉ xét bản published ở ngôn ngữ đang hoạt động', async () => {
      await service.findBySlug(vi, 'huong-dan-angular', ip);

      expect(postModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            postId: 3,
            status: 'published',
            languageId: { [Op.in]: [1, 2] },
          },
        }),
      );
    });

    it('lần xem đầu của IP thì tăng lượt xem, key view có TTL 1 giờ', async () => {
      await service.findBySlug(vi, 'huong-dan-angular', ip);

      expect(redisClient.set).toHaveBeenCalledWith(
        'view:10:1.2.3.4',
        '1',
        'EX',
        CacheTtl.view,
        'NX',
      );
      expect(postModel.increment).toHaveBeenCalledWith('viewCount', {
        by: 1,
        where: { id: 10 },
      });
    });

    it('IP đã xem trong 1 giờ thì không tăng lượt xem', async () => {
      redisClient.set.mockResolvedValue(null);

      const result = await service.findBySlug(vi, 'huong-dan-angular', ip);

      expect(postModel.increment).not.toHaveBeenCalled();
      expect(result.viewCount).toBe(5);
    });

    it('danh mục chưa có tên ở ngôn ngữ đang chọn thì dùng ngôn ngữ mặc định', async () => {
      const result = await service.findBySlug(en, 'angular-tutorial', ip);

      expect(categoryModel.findAll).toHaveBeenCalledWith({
        where: {
          categoryId: { [Op.in]: [1] },
          languageId: { [Op.in]: [2, 1] },
        },
      });
      expect(result.category).toEqual({
        name: 'Lập trình',
        slug: 'lap-trinh',
      });
    });

    it.each([
      ['khách', undefined, false],
      ['user thường', { id: 99, role: 'user', jti: 'x' }, false],
      ['blog owner khác', { id: 8, role: 'blog_owner', jti: 'x' }, false],
      ['tác giả bài', { id: 7, role: 'blog_owner', jti: 'x' }, true],
      ['super admin', { id: 1, role: 'super_admin', jti: 'x' }, true],
    ] as const)(
      'canDeleteComments với %s là %s',
      async (_name, viewer, expected) => {
        const result = await service.findBySlug(
          vi,
          'huong-dan-angular',
          ip,
          viewer ? { ...viewer } : undefined,
        );

        expect(result.canDeleteComments).toBe(expected);
      },
    );
  });

  describe('findRelated', () => {
    it('tối đa 4 bài cùng danh mục, cùng ngôn ngữ, bỏ bài đang xem', async () => {
      await service.findRelated(vi, 'huong-dan-angular');

      expect(RELATED_LIMIT).toBe(4);
      expect(postModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { languageId: 1, status: 'published' },
          limit: 4,
          offset: 0,
          include: [
            expect.objectContaining({
              where: { categoryId: 1, id: { [Op.ne]: 3 } },
            }),
          ],
        }),
      );
    });

    it('slug không có ở ngôn ngữ đang chọn thì 404', async () => {
      postModel.findOne.mockResolvedValue(null);

      const error = await service
        .findRelated(vi, 'khong-co')
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
      expect(postModel.findAndCountAll).not.toHaveBeenCalled();
    });

    it('không tăng lượt xem', async () => {
      await service.findRelated(vi, 'huong-dan-angular');

      expect(redisClient.set).not.toHaveBeenCalled();
      expect(postModel.increment).not.toHaveBeenCalled();
    });
  });
});

describe('PostsService - UC19', () => {
  let service: PostsService;
  let postModel: { findAndCountAll: jest.Mock };
  let cacheService: { wrap: jest.Mock };

  const vi: RequestLanguage = { id: 1, code: 'vi', isDefault: true };

  interface FindOptions {
    where: Record<string | symbol, unknown>;
    replacements?: Record<string, string>;
    order: [unknown, string][];
    limit: number;
    offset: number;
  }
  const lastOptions = () =>
    postModel.findAndCountAll.mock.calls[0][0] as FindOptions;

  beforeEach(() => {
    postModel = {
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    };
    cacheService = { wrap: jest.fn() };
    service = new PostsService(
      postModel as unknown as typeof PostTranslation,
      {
        findAll: jest.fn().mockResolvedValue([]),
      } as unknown as typeof CategoryTranslation,
      {} as typeof Comment,
      {
        findActive: jest.fn().mockResolvedValue([]),
      } as unknown as LanguagesService,
      cacheService as unknown as CacheService,
      {} as RedisService,
    );
  });

  describe('toBooleanSearchTerm', () => {
    it('mỗi từ bắt buộc có trong kết quả (AND)', () => {
      expect(toBooleanSearchTerm('cơ sở dữ liệu')).toBe('+cơ +sở +dữ +liệu');
    });

    it('bỏ toán tử của BOOLEAN MODE và gộp khoảng trắng', () => {
      expect(toBooleanSearchTerm('+lập  -trình* "abc" (xy) <yz> ~zz @33')).toBe(
        '+lập +trình +abc +xy +yz +zz +33',
      );
    });

    it('tách từ ở dấu câu, giữ chữ có dấu và số', () => {
      expect(toBooleanSearchTerm('Node.js 22, Angular-21')).toBe(
        '+Node +js +22 +Angular +21',
      );
    });

    it('giữ chữ có dấu gõ kiểu tổ hợp (NFD)', () => {
      expect(toBooleanSearchTerm('lập'.normalize('NFD'))).toBe(
        '+' + 'lập'.normalize('NFD'),
      );
    });

    it('bỏ từ 1 ký tự vì ngắn hơn ngram_token_size', () => {
      expect(toBooleanSearchTerm('C# và a b docker')).toBe('+và +docker');
    });

    it('không còn từ nào thì trả chuỗi rỗng', () => {
      expect(toBooleanSearchTerm('+-"*')).toBe('');
      expect(toBooleanSearchTerm('a b c')).toBe('');
    });
  });

  it('chỉ tìm bản published ở ngôn ngữ đang chọn, khớp FULLTEXT ngram', async () => {
    await service.search(vi, 'lập trình', 1, 10);

    const options = lastOptions();
    expect(options.where).toMatchObject({ languageId: 1, status: 'published' });
    const conditions = options.where[Op.and] as { val: string }[];
    expect(conditions).toHaveLength(1);
    expect(conditions[0].val).toContain(
      'MATCH (`PostTranslation`.`title`, `PostTranslation`.`excerpt`, `PostTranslation`.`content`)',
    );
    expect(conditions[0].val).toContain('AGAINST (:search IN BOOLEAN MODE)');
  });

  it('truyền từ khóa bằng replacement, không nối vào chuỗi SQL', async () => {
    await service.search(vi, "docker' OR '1'='1", 1, 10);

    const options = lastOptions();
    expect(options.replacements).toEqual({ search: '+docker +OR' });
    const conditions = options.where[Op.and] as { val: string }[];
    expect(conditions[0].val).not.toContain('docker');
  });

  it('sắp liên quan nhất trước, trùng điểm thì mới nhất trước', async () => {
    await service.search(vi, 'docker', 1, 10);

    const [first, ...rest] = lastOptions().order;
    expect((first[0] as { val: string }).val).toContain('AGAINST (:search');
    expect(first[1]).toBe('DESC');
    expect(rest).toEqual([
      ['publishedAt', 'DESC'],
      ['id', 'DESC'],
    ]);
  });

  it('phân trang theo page và limit', async () => {
    postModel.findAndCountAll.mockResolvedValue({ rows: [], count: 25 });

    const result = await service.search(vi, 'docker', 3, 10);

    expect(lastOptions()).toMatchObject({ limit: 10, offset: 20 });
    expect(isPaginated(result)).toBe(true);
    expect(result.meta).toEqual({
      page: 3,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('không còn từ nào để tìm thì trả rỗng, không truy vấn database', async () => {
    const result = await service.search(vi, '+ a', 1, 10);

    expect(postModel.findAndCountAll).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it('không dùng cache', async () => {
    await service.search(vi, 'docker', 1, 10);

    expect(cacheService.wrap).not.toHaveBeenCalled();
  });

  it('findCards không có search thì không lọc FULLTEXT, không có replacement', async () => {
    await service.findCards(vi, {
      limit: 10,
      offset: 0,
      order: [['publishedAt', 'DESC']],
    });

    const options = lastOptions();
    expect(options.where[Op.and]).toBeUndefined();
    expect(options.replacements).toBeUndefined();
  });
});
