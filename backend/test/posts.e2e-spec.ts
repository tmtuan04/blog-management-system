/**
 * E2E Test - C1 / UC05
 *
 * GET /api/v1/posts
 * GET /api/v1/posts/popular
 *
 * Test environment:
 * - MySQL: blog_test
 * - Redis: DB 1
 * - Jest + Supertest
 */

// Mock tạm thời để xử lý lỗi tương thích Jest / htmlparser2 ESM.
// Không sử dụng mock này để kiểm thử tính năng sanitize HTML.
jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: jest.fn((html: string) => html),
}));

import request from 'supertest';

import { Category } from '../src/modules/categories/models/category.model';
import { CategoryTranslation } from '../src/modules/categories/models/category-translation.model';
import { Language } from '../src/modules/languages/models/language.model';
import { Post } from '../src/modules/posts/models/post.model';
import { PostTranslation } from '../src/modules/posts/models/post-translation.model';

import { TestContext, createTestApp } from './helpers/app';
import { tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

// Khai báo kiểu dữ liệu để tránh lỗi ESLint no-unsafe-call
interface PublicPostCard {
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail: string | null;
  category: {
    name: string;
    slug: string;
  } | null;
  author: {
    fullName: string;
    avatar: string | null;
  };
  publishedAt: string | null;
  viewCount: number;
  readingMinutes: number;
}

describe('Public Posts - UC05 (e2e)', () => {
  let ctx: TestContext;

  const server = () => ctx.app.getHttpServer();

  const api = (path = '') => `/api/v1/posts${path}`;

  // =========================================================
  // 1. SETUP / TEARDOWN
  // =========================================================

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

  // =========================================================
  // 2. HELPER - TẠO DỮ LIỆU MẪU
  // =========================================================

  async function seedPosts(): Promise<void> {
    // Tạo user dùng làm tác giả bài viết
    const { user } = await tokenFor(ctx.app, 'super_admin');

    // Lấy ngôn ngữ từ database test
    const vi = await Language.findOne({
      where: { code: 'vi' },
    });

    const en = await Language.findOne({
      where: { code: 'en' },
    });

    if (!vi || !en) {
      throw new Error('Thiếu dữ liệu ngôn ngữ vi/en');
    }

    // Tạo danh mục
    const category = await Category.create({});

    // Chỉ tạo bản dịch tiếng Việt cho danh mục
    // Dùng để kiểm tra category fallback
    await CategoryTranslation.create({
      categoryId: category.id,
      languageId: vi.id,
      name: 'Công nghệ',
      slug: 'cong-nghe',
    });

    /**
     * Tạo bài viết và các bản dịch.
     *
     * Bản tiếng Việt: bắt buộc.
     * Bản tiếng Anh: tùy chọn.
     */
    async function createPost(
      titleVi: string,
      slugVi: string,
      viewCountVi: number,
      status: 'draft' | 'published',
      english?: {
        title: string;
        slug: string;
        viewCount: number;
      },
    ): Promise<void> {
      const post = await Post.create({
        userId: user.id,
        languageId: vi!.id,
        categoryId: category.id,
      });

      // Bản dịch tiếng Việt
      await PostTranslation.create({
        postId: post.id,
        languageId: vi!.id,
        title: titleVi,
        slug: slugVi,
        excerpt: 'Mô tả bài viết',
        content: '<p>Nội dung bài viết mẫu</p>',
        status,
        viewCount: viewCountVi,
        ...(status === 'published'
          ? {
              publishedAt: new Date('2026-11-01T08:00:00Z'),
            }
          : {}),
      });

      // Bản dịch tiếng Anh (nếu có)
      if (english) {
        await PostTranslation.create({
          postId: post.id,
          languageId: en!.id,
          title: english.title,
          slug: english.slug,
          excerpt: 'Sample excerpt',
          content: '<p>Sample article content</p>',
          status: 'published',
          viewCount: english.viewCount,
          publishedAt: new Date('2026-11-01T08:00:00Z'),
        });
      }
    }

    // Bài 1: Published, có cả tiếng Việt và tiếng Anh
    await createPost('Bài học Node.js', 'bai-hoc-nodejs', 20, 'published', {
      title: 'Node.js Basics',
      slug: 'nodejs-basics',
      viewCount: 10,
    });

    // Bài 2: Published, có cả tiếng Việt và tiếng Anh
    await createPost('Tìm hiểu Redis', 'tim-hieu-redis', 100, 'published', {
      title: 'Redis Guide',
      slug: 'redis-guide',
      viewCount: 50,
    });

    // Bài 3: Draft, không được hiển thị công khai
    await createPost('Bài viết nháp', 'bai-viet-nhap', 999, 'draft');

    // Bài 4: Published, chỉ có tiếng Việt
    await createPost(
      'Hướng dẫn TypeScript',
      'huong-dan-typescript',
      40,
      'published',
    );
  }

  // =========================================================
  // 3. GET /api/v1/posts - E2E CƠ BẢN
  // =========================================================

  describe('GET /api/v1/posts', () => {
    // TEST 1
    it('trả HTTP 200 và đúng định dạng phân trang', async () => {
      const res = await request(server())
        .get(api('?page=1&limit=10'))
        .set('Accept-Language', 'vi')
        .expect(200);

      expect(res.body.success).toBe(true);

      expect(Array.isArray(res.body.data)).toBe(true);

      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    // TEST 2
    it('trả danh sách rỗng khi chưa có bài viết', async () => {
      const res = await request(server()).get(api()).expect(200);

      expect(res.body.success).toBe(true);

      expect(res.body.data).toEqual([]);

      expect(res.body.meta.total).toBe(0);
    });

    // TEST 3
    it('trả HTTP 400 khi page = 0', async () => {
      const res = await request(server())
        .get(api('?page=0&limit=10'))
        .expect(400);

      expect(res.body.success).toBe(false);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    // TEST 4
    it('trả HTTP 400 khi limit > 50', async () => {
      const res = await request(server())
        .get(api('?page=1&limit=51'))
        .expect(400);

      expect(res.body.success).toBe(false);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    // TEST 5
    it('chấp nhận header tiếng Việt', async () => {
      const res = await request(server())
        .get(api())
        .set('Accept-Language', 'vi')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    // TEST 6
    it('chấp nhận header tiếng Anh', async () => {
      const res = await request(server())
        .get(api())
        .set('Accept-Language', 'en')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================
  // 4. GET /api/v1/posts/popular - E2E CƠ BẢN
  // =========================================================

  describe('GET /api/v1/posts/popular', () => {
    // TEST 7
    it('trả HTTP 200 và mảng dữ liệu', async () => {
      const res = await request(server())
        .get(api('/popular?limit=5'))
        .expect(200);

      expect(res.body.success).toBe(true);

      expect(res.body.data).toEqual([]);
    });

    // TEST 8
    it('trả HTTP 400 khi limit > 10', async () => {
      const res = await request(server())
        .get(api('/popular?limit=11'))
        .expect(400);

      expect(res.body.success).toBe(false);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================
  // 5. E2E VỚI DỮ LIỆU THỰC TẾ
  // =========================================================

  describe('Public Posts - kiểm thử dữ liệu', () => {
    // -------------------------------------------------------
    // TEST 9: CHỈ LẤY BÀI PUBLISHED
    // -------------------------------------------------------

    it('chỉ trả các bài viết đã published', async () => {
      await seedPosts();

      const res = await request(server())
        .get(api('?page=1&limit=10'))
        .set('Accept-Language', 'vi')
        .expect(200);

      expect(res.body.success).toBe(true);

      expect(res.body.meta.total).toBe(3);

      expect(res.body.data).toHaveLength(3);

      // Ép kiểu rõ ràng trước khi gọi .map()
      const posts = res.body.data as PublicPostCard[];

      const slugs = posts.map((post) => post.slug);

      expect(slugs).toContain('bai-hoc-nodejs');

      expect(slugs).toContain('tim-hieu-redis');

      expect(slugs).toContain('huong-dan-typescript');

      // Không trả bài draft
      expect(slugs).not.toContain('bai-viet-nhap');
    });

    // -------------------------------------------------------
    // TEST 10: PHÂN TRANG KHI CÓ DỮ LIỆU
    // -------------------------------------------------------

    it('phân trang chính xác khi có nhiều bài', async () => {
      await seedPosts();

      const page1 = await request(server())
        .get(api('?page=1&limit=1'))
        .set('Accept-Language', 'vi')
        .expect(200);

      const page2 = await request(server())
        .get(api('?page=2&limit=1'))
        .set('Accept-Language', 'vi')
        .expect(200);

      expect(page1.body.meta).toEqual({
        page: 1,
        limit: 1,
        total: 3,
        totalPages: 3,
      });

      expect(page2.body.meta).toEqual({
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
      });

      expect(page1.body.data).toHaveLength(1);

      expect(page2.body.data).toHaveLength(1);

      // Hai trang phải chứa các bài khác nhau
      expect(page1.body.data[0].slug).not.toBe(page2.body.data[0].slug);
    });

    // -------------------------------------------------------
    // TEST 11: NGÔN NGỮ VÀ CATEGORY FALLBACK
    // -------------------------------------------------------

    it('trả đúng bản dịch tiếng Anh và fallback danh mục', async () => {
      await seedPosts();

      const res = await request(server())
        .get(api('?page=1&limit=10'))
        .set('Accept-Language', 'en')
        .expect(200);

      expect(res.body.success).toBe(true);

      // Hai bài có bản dịch tiếng Anh
      expect(res.body.meta.total).toBe(2);

      expect(res.body.data).toHaveLength(2);

      // Khai báo kiểu dữ liệu cụ thể
      const posts = res.body.data as PublicPostCard[];

      const titles = posts.map((post) => post.title);

      expect(titles).toContain('Node.js Basics');

      expect(titles).toContain('Redis Guide');

      expect(titles).not.toContain('Bài học Node.js');

      // Danh mục chưa có bản dịch tiếng Anh,
      // nên phải sử dụng tiếng Việt mặc định
      for (const post of posts) {
        expect(post.category).toEqual({
          name: 'Công nghệ',
          slug: 'cong-nghe',
        });
      }
    });

    // -------------------------------------------------------
    // TEST 12: POPULAR SORTING
    // -------------------------------------------------------

    it('Popular sắp xếp viewCount giảm dần', async () => {
      await seedPosts();

      const res = await request(server())
        .get(api('/popular?limit=2'))
        .set('Accept-Language', 'vi')
        .expect(200);

      expect(res.body.success).toBe(true);

      expect(res.body.data).toHaveLength(2);

      // Khai báo kiểu dữ liệu cụ thể
      const posts = res.body.data as PublicPostCard[];

      const titles = posts.map((post) => post.title);

      // Redis: 100 views
      // TypeScript: 40 views
      // Node.js: 20 views
      // Draft: 999 views, nhưng phải bị loại
      expect(titles).toEqual(['Tìm hiểu Redis', 'Hướng dẫn TypeScript']);

      expect(posts[0].viewCount).toBe(100);

      expect(posts[1].viewCount).toBe(40);

      expect(posts[0].viewCount).toBeGreaterThan(posts[1].viewCount);
    });
  });
});
