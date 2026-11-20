/**
 * E2E Test - C2 / UC07
 *
 * GET /api/v1/categories
 * GET /api/v1/categories/:slug
 * GET /api/v1/categories/:slug/posts
 *
 * Test environment: MySQL blog_test, Redis DB 1
 */

import request from 'supertest';

import { Category } from '../src/modules/categories/models/category.model';
import { CategoryTranslation } from '../src/modules/categories/models/category-translation.model';
import { Language } from '../src/modules/languages/models/language.model';
import { Post } from '../src/modules/posts/models/post.model';
import { PostTranslation } from '../src/modules/posts/models/post-translation.model';

import { TestContext, createTestApp } from './helpers/app';
import { tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

// Workaround lỗi Jest ESM / sanitize-html có sẵn của dự án.
// Không dùng mock này để kiểm thử tính năng lọc HTML.
jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: jest.fn((html: string) => html),
}));

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  postCount: number;
  translations?: { code: string; slug: string }[];
}

interface PostCard {
  slug: string;
  title: string;
  category: { name: string; slug: string } | null;
}

interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiBody<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
  code?: string;
}

describe('Public Categories - UC07 (e2e)', () => {
  let ctx: TestContext;

  const server = () => ctx.app.getHttpServer();
  const api = (path = '') => `/api/v1/categories${path}`;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.app.close();
    }
  });

  async function seedCategories(): Promise<void> {
    const { user } = await tokenFor(ctx.app, 'super_admin');

    const vi = await Language.findOne({
      where: { code: 'vi' },
    });

    const en = await Language.findOne({
      where: { code: 'en' },
    });

    if (!vi || !en) {
      throw new Error('Thiếu ngôn ngữ vi/en trong database test');
    }

    const programming = await Category.create({});
    const lifestyle = await Category.create({});

    await CategoryTranslation.bulkCreate([
      {
        categoryId: programming.id,
        languageId: vi.id,
        name: 'Lập trình',
        slug: 'lap-trinh',
      },
      {
        categoryId: programming.id,
        languageId: en.id,
        name: 'Programming',
        slug: 'programming',
      },
      {
        categoryId: lifestyle.id,
        languageId: vi.id,
        name: 'Đời sống',
        slug: 'doi-song',
      },
    ]);

    async function createPost(
      categoryId: number,
      title: string,
      slug: string,
      status: 'published' | 'draft',
      date: string,
      english?: { title: string; slug: string },
    ): Promise<void> {
      const post = await Post.create({
        userId: user.id,
        languageId: vi!.id,
        categoryId,
      });

      await PostTranslation.create({
        postId: post.id,
        languageId: vi!.id,
        title,
        slug,
        excerpt: 'Mô tả bài viết mẫu',
        content: '<p>Nội dung bài viết</p>',
        status,
        ...(status === 'published' ? { publishedAt: new Date(date) } : {}),
      });

      if (english) {
        await PostTranslation.create({
          postId: post.id,
          languageId: en!.id,
          title: english.title,
          slug: english.slug,
          excerpt: 'Sample excerpt',
          content: '<p>Sample article content</p>',
          status: 'published',
          publishedAt: new Date(date),
        });
      }
    }

    // Hai bài published thuộc Lập trình, chỉ một bài có bản tiếng Anh
    await createPost(
      programming.id,
      'Bài học Node.js',
      'bai-hoc-nodejs',
      'published',
      '2026-11-01T08:00:00Z',
      { title: 'Node.js Basics', slug: 'nodejs-basics' },
    );

    await createPost(
      programming.id,
      'Tìm hiểu Redis',
      'tim-hieu-redis',
      'published',
      '2026-11-03T08:00:00Z',
    );

    // Bài draft không được đếm và không được hiển thị
    await createPost(
      programming.id,
      'Bài viết nháp',
      'bai-viet-nhap',
      'draft',
      '2026-11-04T08:00:00Z',
    );

    // Danh mục chỉ có tên tiếng Việt
    await createPost(
      lifestyle.id,
      'Cuộc sống hằng ngày',
      'cuoc-song-hang-ngay',
      'published',
      '2026-11-02T08:00:00Z',
    );
  }

  it('1. Danh sách rỗng khi chưa có danh mục', async () => {
    const response = await request(server())
      .get(api())
      .set('Accept-Language', 'vi')
      .expect(200);

    const body = response.body as ApiBody<CategoryData[]>;

    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('2. Lấy danh mục tiếng Việt và postCount', async () => {
    await seedCategories();

    const response = await request(server())
      .get(api())
      .set('Accept-Language', 'vi')
      .expect(200);

    const body = response.body as ApiBody<CategoryData[]>;

    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Lập trình',
          slug: 'lap-trinh',
          postCount: 2,
        }),
        expect.objectContaining({
          name: 'Đời sống',
          slug: 'doi-song',
          postCount: 1,
        }),
      ]),
    );
  });

  it('3. Danh sách tiếng Anh fallback tên mặc định', async () => {
    await seedCategories();

    const response = await request(server())
      .get(api())
      .set('Accept-Language', 'en')
      .expect(200);

    const body = response.body as ApiBody<CategoryData[]>;

    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Programming',
          slug: 'programming',
          postCount: 1,
        }),
        expect.objectContaining({
          name: 'Đời sống',
          slug: 'doi-song',
          postCount: 0,
        }),
      ]),
    );
  });

  it('4. Chi tiết danh mục trả về các bản dịch', async () => {
    await seedCategories();

    const response = await request(server())
      .get(api('/lap-trinh'))
      .set('Accept-Language', 'vi')
      .expect(200);

    const body = response.body as ApiBody<CategoryData>;

    expect(body.data).toMatchObject({
      name: 'Lập trình',
      slug: 'lap-trinh',
      postCount: 2,
    });

    expect(body.data.translations).toEqual([
      { code: 'vi', slug: 'lap-trinh' },
      { code: 'en', slug: 'programming' },
    ]);
  });

  it('5. Chi tiết tiếng Anh sử dụng slug tiếng Anh', async () => {
    await seedCategories();

    const response = await request(server())
      .get(api('/programming'))
      .set('Accept-Language', 'en')
      .expect(200);

    const body = response.body as ApiBody<CategoryData>;

    expect(body.data).toMatchObject({
      name: 'Programming',
      slug: 'programming',
      postCount: 1,
    });
  });

  it('6. Fallback slug khi thiếu bản dịch tiếng Anh', async () => {
    await seedCategories();

    const response = await request(server())
      .get(api('/doi-song'))
      .set('Accept-Language', 'en')
      .expect(200);

    const body = response.body as ApiBody<CategoryData>;

    expect(body.data).toMatchObject({
      name: 'Đời sống',
      slug: 'doi-song',
      postCount: 0,
    });
  });

  it('7. Bài viết phân trang và sắp xếp mới nhất', async () => {
    await seedCategories();

    const first = await request(server())
      .get(api('/lap-trinh/posts?page=1&limit=1'))
      .set('Accept-Language', 'vi')
      .expect(200);

    const body1 = first.body as ApiBody<PostCard[]>;

    expect(body1.data).toHaveLength(1);
    expect(body1.data[0].slug).toBe('tim-hieu-redis');
    expect(body1.meta).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });

    const second = await request(server())
      .get(api('/lap-trinh/posts?page=2&limit=1'))
      .set('Accept-Language', 'vi')
      .expect(200);

    const body2 = second.body as ApiBody<PostCard[]>;

    expect(body2.data).toHaveLength(1);
    expect(body2.data[0].slug).toBe('bai-hoc-nodejs');
  });

  it('8. Chỉ lấy bài published ở ngôn ngữ tiếng Anh', async () => {
    await seedCategories();

    const response = await request(server())
      .get(api('/programming/posts?page=1&limit=10'))
      .set('Accept-Language', 'en')
      .expect(200);

    const body = response.body as ApiBody<PostCard[]>;

    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Node.js Basics');
    expect(body.data[0].category).toEqual({
      name: 'Programming',
      slug: 'programming',
    });
    expect(body.meta?.total).toBe(1);
  });

  it('9. Bài viết danh mục fallback trả danh sách rỗng', async () => {
    await seedCategories();

    const response = await request(server())
      .get(api('/doi-song/posts?page=1&limit=10'))
      .set('Accept-Language', 'en')
      .expect(200);

    const body = response.body as ApiBody<PostCard[]>;

    expect(body.data).toEqual([]);
    expect(body.meta?.total).toBe(0);
  });

  it('10. Tham số phân trang không hợp lệ trả HTTP 400', async () => {
    const badPage = await request(server())
      .get(api('/lap-trinh/posts?page=0&limit=10'))
      .expect(400);

    const badLimit = await request(server())
      .get(api('/lap-trinh/posts?page=1&limit=51'))
      .expect(400);

    expect((badPage.body as ApiBody<unknown>).code).toBe('VALIDATION_ERROR');
    expect((badLimit.body as ApiBody<unknown>).code).toBe('VALIDATION_ERROR');
  });

  it('11. Danh mục không tồn tại trả HTTP 404', async () => {
    const detail = await request(server())
      .get(api('/danh-muc-khong-ton-tai'))
      .expect(404);

    const posts = await request(server())
      .get(api('/danh-muc-khong-ton-tai/posts'))
      .expect(404);

    expect((detail.body as ApiBody<unknown>).code).toBe('NOT_FOUND');
    expect((posts.body as ApiBody<unknown>).code).toBe('NOT_FOUND');
  });
});
