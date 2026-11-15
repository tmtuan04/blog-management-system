/**
 * E2E - A4 / UC06
 *
 * GET /api/v1/posts/:slug
 * GET /api/v1/posts/:slug/related
 */

import request from 'supertest';

import { CachePrefix } from '../src/common/utils/redis-keys';
import { CacheService } from '../src/infra/redis/cache.service';
import { Category } from '../src/modules/categories/models/category.model';
import { CategoryTranslation } from '../src/modules/categories/models/category-translation.model';
import { Comment } from '../src/modules/comments/models/comment.model';
import { Language } from '../src/modules/languages/models/language.model';
import { Post } from '../src/modules/posts/models/post.model';
import {
  PostTranslation,
  type PostStatus,
} from '../src/modules/posts/models/post-translation.model';
import type { User } from '../src/modules/users/models/user.model';

import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

interface PostDetailBody {
  translationId: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  thumbnail: string | null;
  category: { name: string; slug: string } | null;
  author: { fullName: string; avatar: string | null };
  publishedAt: string | null;
  viewCount: number;
  readingMinutes: number;
  commentCount: number;
  availableLanguages: { code: string; name: string; slug: string }[];
  canDeleteComments: boolean;
}

interface PostCardBody {
  slug: string;
  title: string;
}

describe('Post detail - UC06 (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const api = (path: string) => `/api/v1/posts${path}`;

  let vi: Language;
  let en: Language;
  let author: User;
  let authorToken: string;
  let mainCategory: Category;
  let otherCategory: Category;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    if (ctx) await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);

    vi = (await Language.findOne({ where: { code: 'vi' } }))!;
    en = (await Language.findOne({ where: { code: 'en' } }))!;
    ({ user: author, token: authorToken } = await tokenFor(
      ctx.app,
      'blog_owner',
      { fullName: 'Nguyễn Văn An' },
    ));

    mainCategory = await Category.create({});
    otherCategory = await Category.create({});
    // Danh mục chính chỉ có tên tiếng Việt: bản en phải dùng tên vi
    await CategoryTranslation.create({
      categoryId: mainCategory.id,
      languageId: vi.id,
      name: 'Lập trình',
      slug: 'lap-trinh',
    });
    await CategoryTranslation.create({
      categoryId: otherCategory.id,
      languageId: vi.id,
      name: 'Đời sống',
      slug: 'doi-song',
    });
  });

  let dayCounter = 0;

  /** Tạo bài gốc vi + các bản dịch; thứ tự gọi = thứ tự đăng (bài sau mới hơn) */
  async function createPost(
    translations: {
      language: Language;
      slug: string;
      status?: PostStatus;
      viewCount?: number;
    }[],
    category = mainCategory,
  ): Promise<{ post: Post; rows: PostTranslation[] }> {
    dayCounter += 1;
    const post = await Post.create({
      userId: author.id,
      languageId: vi.id,
      categoryId: category.id,
    });
    const rows: PostTranslation[] = [];
    for (const item of translations) {
      const status = item.status ?? 'published';
      rows.push(
        await PostTranslation.create({
          postId: post.id,
          languageId: item.language.id,
          title: `Tiêu đề ${item.slug}`,
          slug: item.slug,
          excerpt: 'Tóm tắt',
          content: '<p>Nội dung bài viết</p>',
          status,
          viewCount: item.viewCount ?? 0,
          publishedAt:
            status === 'published'
              ? new Date(Date.UTC(2026, 9, dayCounter))
              : null,
        }),
      );
    }
    return { post, rows };
  }

  // =========================================================
  // GET /posts/:slug
  // =========================================================

  describe('GET /posts/:slug', () => {
    it('200: trả đủ chi tiết của bản dịch ở ngôn ngữ đang chọn', async () => {
      const { rows } = await createPost([
        { language: vi, slug: 'huong-dan-angular', viewCount: 10 },
        { language: en, slug: 'angular-tutorial' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      await Comment.create({
        postTranslationId: rows[0].id,
        userId: reader.id,
        content: 'Bài hay',
      });

      const res = await request(server())
        .get(api('/huong-dan-angular'))
        .set('Accept-Language', 'vi')
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data as PostDetailBody;
      expect(data).toMatchObject({
        translationId: rows[0].id,
        slug: 'huong-dan-angular',
        title: 'Tiêu đề huong-dan-angular',
        content: '<p>Nội dung bài viết</p>',
        category: { name: 'Lập trình', slug: 'lap-trinh' },
        author: { fullName: 'Nguyễn Văn An', avatar: null },
        viewCount: 11,
        readingMinutes: 1,
        commentCount: 1,
        canDeleteComments: false,
      });
      expect(data.availableLanguages).toEqual([
        { code: 'vi', name: expect.any(String), slug: 'huong-dan-angular' },
        { code: 'en', name: expect.any(String), slug: 'angular-tutorial' },
      ]);
      expect(data).not.toHaveProperty('userId');
    });

    it('bản en: dùng slug en, danh mục thiếu tên en thì dùng tên vi', async () => {
      await createPost([
        { language: vi, slug: 'huong-dan-angular' },
        { language: en, slug: 'angular-tutorial' },
      ]);

      const res = await request(server())
        .get(api('/angular-tutorial'))
        .set('Accept-Language', 'en')
        .expect(200);

      const data = res.body.data as PostDetailBody;
      expect(data.slug).toBe('angular-tutorial');
      expect(data.category).toEqual({ name: 'Lập trình', slug: 'lap-trinh' });
    });

    it('404 khi slug không có', async () => {
      const res = await request(server())
        .get(api('/khong-ton-tai'))
        .set('Accept-Language', 'vi')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('404 khi slug thuộc ngôn ngữ khác ngôn ngữ đang chọn', async () => {
      await createPost([
        { language: vi, slug: 'huong-dan-angular' },
        { language: en, slug: 'angular-tutorial' },
      ]);

      await request(server())
        .get(api('/angular-tutorial'))
        .set('Accept-Language', 'vi')
        .expect(404);
    });

    it.each(['draft', 'archived'] as const)(
      '404 khi bản dịch đang %s',
      async (status) => {
        await createPost([{ language: vi, slug: 'bai-chua-dang', status }]);

        await request(server())
          .get(api('/bai-chua-dang'))
          .set('Accept-Language', 'vi')
          .expect(404);
      },
    );

    it('availableLanguages bỏ bản dịch chưa đăng và ngôn ngữ đã tắt', async () => {
      await createPost([
        { language: vi, slug: 'bai-a' },
        { language: en, slug: 'post-a', status: 'draft' },
      ]);

      const draftRes = await request(server())
        .get(api('/bai-a'))
        .set('Accept-Language', 'vi')
        .expect(200);
      expect(
        (draftRes.body.data as PostDetailBody).availableLanguages.map(
          (item) => item.code,
        ),
      ).toEqual(['vi']);

      await PostTranslation.update(
        { status: 'published', publishedAt: new Date() },
        { where: { slug: 'post-a' } },
      );
      await Language.update({ isActive: false }, { where: { id: en.id } });
      // Danh sách ngôn ngữ đang hoạt động có cache; xóa để thấy ngay
      await resetLanguageCache();

      const res = await request(server())
        .get(api('/bai-a'))
        .set('Accept-Language', 'vi')
        .expect(200);
      expect(
        (res.body.data as PostDetailBody).availableLanguages.map(
          (item) => item.code,
        ),
      ).toEqual(['vi']);
    });

    it('mỗi IP chỉ tăng lượt xem 1 lần trong 1 giờ cho mỗi bản dịch', async () => {
      const { rows } = await createPost([
        { language: vi, slug: 'bai-a', viewCount: 5 },
        { language: en, slug: 'post-a', viewCount: 0 },
      ]);

      const first = await request(server())
        .get(api('/bai-a'))
        .set('Accept-Language', 'vi')
        .expect(200);
      const second = await request(server())
        .get(api('/bai-a'))
        .set('Accept-Language', 'vi')
        .expect(200);
      expect((first.body.data as PostDetailBody).viewCount).toBe(6);
      expect((second.body.data as PostDetailBody).viewCount).toBe(6);

      // IP khác (trust proxy loopback nên đọc X-Forwarded-For) thì được tính
      await request(server())
        .get(api('/bai-a'))
        .set('Accept-Language', 'vi')
        .set('X-Forwarded-For', '203.0.113.9')
        .expect(200);

      // Bản dịch khác của cùng bài được tính riêng
      await request(server())
        .get(api('/post-a'))
        .set('Accept-Language', 'en')
        .expect(200);

      await rows[0].reload();
      await rows[1].reload();
      expect(rows[0].viewCount).toBe(7);
      expect(rows[1].viewCount).toBe(1);
    });

    it('lượt xem không xóa cache danh sách bài', async () => {
      await createPost([{ language: vi, slug: 'bai-a', viewCount: 5 }]);

      await request(server())
        .get(api(''))
        .set('Accept-Language', 'vi')
        .expect(200);
      await request(server())
        .get(api('/bai-a'))
        .set('Accept-Language', 'vi')
        .expect(200);
      const list = await request(server())
        .get(api(''))
        .set('Accept-Language', 'vi')
        .expect(200);

      // Danh sách còn lấy từ cache nên vẫn là 5 (được trễ tối đa 5 phút)
      expect((list.body.data as { viewCount: number }[])[0].viewCount).toBe(5);
    });

    describe('canDeleteComments', () => {
      beforeEach(async () => {
        await createPost([{ language: vi, slug: 'bai-a' }]);
      });

      const get = (token?: string) => {
        const req = request(server())
          .get(api('/bai-a'))
          .set('Accept-Language', 'vi');
        return token ? req.set(bearer(token)) : req;
      };

      it('khách: false', async () => {
        const res = await get().expect(200);
        expect((res.body.data as PostDetailBody).canDeleteComments).toBe(false);
      });

      it('token lỗi vẫn xem được như khách', async () => {
        const res = await get('khong-phai-token').expect(200);
        expect((res.body.data as PostDetailBody).canDeleteComments).toBe(false);
      });

      it('user thường: false', async () => {
        const { token } = await tokenFor(ctx.app, 'user');
        const res = await get(token).expect(200);
        expect((res.body.data as PostDetailBody).canDeleteComments).toBe(false);
      });

      it('Blog Owner khác: false', async () => {
        const { token } = await tokenFor(ctx.app, 'blog_owner');
        const res = await get(token).expect(200);
        expect((res.body.data as PostDetailBody).canDeleteComments).toBe(false);
      });

      it('tác giả bài: true', async () => {
        const res = await get(authorToken).expect(200);
        expect((res.body.data as PostDetailBody).canDeleteComments).toBe(true);
      });

      it('Super Admin: true', async () => {
        const { token } = await tokenFor(ctx.app, 'super_admin');
        const res = await get(token).expect(200);
        expect((res.body.data as PostDetailBody).canDeleteComments).toBe(true);
      });
    });
  });

  // =========================================================
  // GET /posts/:slug/related
  // =========================================================

  describe('GET /posts/:slug/related', () => {
    it('tối đa 4 bài cùng danh mục, cùng ngôn ngữ, bỏ bài đang xem, mới nhất trước', async () => {
      await createPost([{ language: vi, slug: 'dang-xem' }]);
      for (let i = 1; i <= 5; i += 1) {
        await createPost([{ language: vi, slug: `cung-danh-muc-${i}` }]);
      }
      await createPost([{ language: vi, slug: 'nhap', status: 'draft' }]);
      await createPost([{ language: en, slug: 'only-english' }]);
      await createPost(
        [{ language: vi, slug: 'khac-danh-muc' }],
        otherCategory,
      );

      const res = await request(server())
        .get(api('/dang-xem/related'))
        .set('Accept-Language', 'vi')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body).not.toHaveProperty('meta');
      expect(
        (res.body.data as PostCardBody[]).map((item) => item.slug),
      ).toEqual([
        'cung-danh-muc-5',
        'cung-danh-muc-4',
        'cung-danh-muc-3',
        'cung-danh-muc-2',
      ]);
    });

    it('không có bài cùng danh mục thì trả mảng rỗng', async () => {
      await createPost([{ language: vi, slug: 'dang-xem' }]);

      const res = await request(server())
        .get(api('/dang-xem/related'))
        .set('Accept-Language', 'vi')
        .expect(200);

      expect(res.body.data).toEqual([]);
    });

    it('404 khi slug không có ở ngôn ngữ đang chọn', async () => {
      const res = await request(server())
        .get(api('/khong-ton-tai/related'))
        .set('Accept-Language', 'vi')
        .expect(404);

      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('không tăng lượt xem', async () => {
      const { rows } = await createPost([
        { language: vi, slug: 'dang-xem', viewCount: 3 },
      ]);

      await request(server())
        .get(api('/dang-xem/related'))
        .set('Accept-Language', 'vi')
        .expect(200);

      await rows[0].reload();
      expect(rows[0].viewCount).toBe(3);
    });
  });

  async function resetLanguageCache(): Promise<void> {
    await ctx.app.get(CacheService).invalidate(CachePrefix.all);
  }
});
