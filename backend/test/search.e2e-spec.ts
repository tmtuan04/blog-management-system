/**
 * E2E - A5 / UC19
 *
 * GET /api/v1/search
 *
 * Chạy trên MySQL thật để kiểm tra FULLTEXT `ngram` với tiếng Việt có dấu.
 */

import request from 'supertest';

import { Category } from '../src/modules/categories/models/category.model';
import { CategoryTranslation } from '../src/modules/categories/models/category-translation.model';
import { Language } from '../src/modules/languages/models/language.model';
import { Post } from '../src/modules/posts/models/post.model';
import {
  PostTranslation,
  type PostStatus,
} from '../src/modules/posts/models/post-translation.model';
import type { User } from '../src/modules/users/models/user.model';

import { TestContext, createTestApp } from './helpers/app';
import { tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

interface PostCardBody {
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail: string | null;
  category: { name: string; slug: string } | null;
  author: { fullName: string; avatar: string | null };
  publishedAt: string | null;
  viewCount: number;
  readingMinutes: number;
}

interface ValidationErrorBody {
  code: string;
  errors: { field: string; message: string }[];
}

const SEARCH_LENGTH_MESSAGE = 'Từ khóa cần từ 2 đến 100 ký tự.';

describe('Search - UC19 (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();

  let vi: Language;
  let en: Language;
  let author: User;
  let category: Category;

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
    ({ user: author } = await tokenFor(ctx.app, 'blog_owner', {
      fullName: 'Nguyễn Văn An',
    }));

    category = await Category.create({});
    await CategoryTranslation.create({
      categoryId: category.id,
      languageId: vi.id,
      name: 'Lập trình',
      slug: 'lap-trinh',
    });
  });

  let dayCounter = 0;

  /** Một bài, một bản dịch; thứ tự gọi = thứ tự đăng (bài sau mới hơn) */
  async function createTranslation(item: {
    language?: Language;
    slug: string;
    title: string;
    excerpt?: string | null;
    content?: string;
    status?: PostStatus;
  }): Promise<PostTranslation> {
    dayCounter += 1;
    const language = item.language ?? vi;
    const status = item.status ?? 'published';
    const post = await Post.create({
      userId: author.id,
      languageId: language.id,
      categoryId: category.id,
    });
    return PostTranslation.create({
      postId: post.id,
      languageId: language.id,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt ?? null,
      content: item.content ?? '<p>Nội dung</p>',
      status,
      publishedAt:
        status === 'published' ? new Date(Date.UTC(2026, 9, dayCounter)) : null,
    });
  }

  const search = (
    q: unknown,
    lang = 'vi',
    extra: Record<string, unknown> = {},
  ) =>
    request(server())
      .get('/api/v1/search')
      .query({ q, ...extra })
      .set('Accept-Language', lang);

  const slugsOf = (body: { data: PostCardBody[] }) =>
    body.data.map((item) => item.slug);

  describe('Thành công', () => {
    it('200: tìm được từ khóa tiếng Việt có dấu, trả thẻ bài đủ field', async () => {
      await createTranslation({
        slug: 'hoc-lap-trinh',
        title: 'Học lập trình TypeScript',
        excerpt: 'Nhập môn cho người mới',
      });
      await createTranslation({ slug: 'docker', title: 'Docker cơ bản' });

      const res = await search('lập trình').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Tìm kiếm bài viết thành công');
      expect(slugsOf(res.body)).toEqual(['hoc-lap-trinh']);
      expect((res.body.data as PostCardBody[])[0]).toEqual({
        slug: 'hoc-lap-trinh',
        title: 'Học lập trình TypeScript',
        excerpt: 'Nhập môn cho người mới',
        thumbnail: null,
        category: { name: 'Lập trình', slug: 'lap-trinh' },
        author: { fullName: 'Nguyễn Văn An', avatar: null },
        publishedAt: expect.any(String) as string,
        viewCount: 0,
        readingMinutes: 1,
      });
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('tìm trong cả tiêu đề, tóm tắt và nội dung', async () => {
      await createTranslation({ slug: 'trong-tieu-de', title: 'Kubernetes' });
      await createTranslation({
        slug: 'trong-tom-tat',
        title: 'Bài A',
        excerpt: 'Triển khai Kubernetes',
      });
      await createTranslation({
        slug: 'trong-noi-dung',
        title: 'Bài B',
        content: '<p>Dùng <strong>Kubernetes</strong> cho production</p>',
      });
      await createTranslation({ slug: 'khong-lien-quan', title: 'Ẩm thực' });

      const res = await search('kubernetes').expect(200);

      expect(slugsOf(res.body).sort()).toEqual([
        'trong-noi-dung',
        'trong-tieu-de',
        'trong-tom-tat',
      ]);
    });

    it('sắp liên quan nhất trước, không theo ngày đăng', async () => {
      // Bài liên quan hơn được đăng trước nên mới nhất trước sẽ ra thứ tự ngược lại
      await createTranslation({
        slug: 'nhieu-lan',
        title: 'Lập trình Angular',
        excerpt: 'Lập trình frontend',
        content: '<p>Lập trình component, lập trình service</p>',
      });
      await createTranslation({
        slug: 'mot-lan',
        title: 'Ghi chú',
        content: '<p>Một chút lập trình</p>',
      });

      const res = await search('lập trình').expect(200);

      expect(slugsOf(res.body)).toEqual(['nhieu-lan', 'mot-lan']);
    });

    it('chỉ bản published ở ngôn ngữ đang chọn', async () => {
      await createTranslation({ slug: 'vi-published', title: 'Docker cơ bản' });
      await createTranslation({
        slug: 'vi-draft',
        title: 'Docker nâng cao',
        status: 'draft',
      });
      await createTranslation({
        slug: 'vi-archived',
        title: 'Docker cũ',
        status: 'archived',
      });
      await createTranslation({
        language: en,
        slug: 'en-published',
        title: 'Docker basics',
      });

      const resVi = await search('docker', 'vi').expect(200);
      expect(slugsOf(resVi.body)).toEqual(['vi-published']);

      const resEn = await search('docker', 'en').expect(200);
      expect(slugsOf(resEn.body)).toEqual(['en-published']);
    });

    it('không có kết quả: 200, data rỗng, total 0', async () => {
      await createTranslation({ slug: 'docker', title: 'Docker cơ bản' });

      const res = await search('kubernetes').expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('nhiều từ: kết quả phải chứa đủ mọi từ (AND)', async () => {
      await createTranslation({
        slug: 'co-so-du-lieu',
        title: 'Tìm hiểu về cơ sở dữ liệu quan hệ',
      });
      await createTranslation({
        slug: 'chi-co-co-so',
        title: 'Cơ sở của thiết kế giao diện',
      });
      await createTranslation({
        slug: 'chi-co-du-lieu',
        title: 'Phân tích dữ liệu bán hàng',
      });

      const res = await search('cơ sở dữ liệu').expect(200);

      expect(slugsOf(res.body)).toEqual(['co-so-du-lieu']);
    });

    // Stopword mặc định của MySQL có `a`, `i`: ngram bỏ mọi token chứa chúng
    // (kể cả à, ậ, ì vì collation không phân biệt dấu). Migration
    // 20261117000001 và docker-compose tắt stopword cho index này.
    it('tìm được từ có chữ a/i (không bị stopword loại khỏi index)', async () => {
      await createTranslation({
        slug: 'rest-api',
        title: 'Hướng dẫn cơ bản về REST API',
      });
      await createTranslation({ slug: 'git', title: 'Giới thiệu Git' });

      expect(slugsOf((await search('REST API').expect(200)).body)).toEqual([
        'rest-api',
      ]);
      expect(slugsOf((await search('api').expect(200)).body)).toEqual([
        'rest-api',
      ]);
      expect(slugsOf((await search('giới thiệu').expect(200)).body)).toEqual([
        'git',
      ]);
    });

    it('gõ không dấu vẫn tìm được bài có dấu', async () => {
      await createTranslation({
        slug: 'hoc-lap-trinh',
        title: 'Học lập trình TypeScript',
      });
      await createTranslation({ slug: 'docker', title: 'Docker cơ bản' });

      const res = await search('lap trinh').expect(200);

      expect(slugsOf(res.body)).toEqual(['hoc-lap-trinh']);
    });

    it('trim từ khóa trước khi tìm', async () => {
      await createTranslation({ slug: 'docker', title: 'Docker cơ bản' });

      const res = await search('   docker   ').expect(200);

      expect(slugsOf(res.body)).toEqual(['docker']);
    });

    it('từ khóa có toán tử BOOLEAN MODE không gây lỗi 500', async () => {
      await createTranslation({ slug: 'docker', title: 'Docker cơ bản' });

      for (const q of ['"docker', '+docker -', 'docker*', '(docker', '@@']) {
        const res = await search(q).expect(200);
        expect(res.body.success).toBe(true);
      }
      const res = await search('"docker').expect(200);
      expect(slugsOf(res.body)).toEqual(['docker']);
    });

    it('phân trang: page 2 nối tiếp page 1, total đếm đủ', async () => {
      for (let i = 1; i <= 3; i += 1) {
        await createTranslation({ slug: `docker-${i}`, title: 'Docker' });
      }

      const page1 = await search('docker', 'vi', { limit: 2 }).expect(200);
      const page2 = await search('docker', 'vi', { limit: 2, page: 2 }).expect(
        200,
      );

      expect(page1.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(slugsOf(page1.body)).toHaveLength(2);
      expect(slugsOf(page2.body)).toHaveLength(1);
      expect(
        new Set([...slugsOf(page1.body), ...slugsOf(page2.body)]).size,
      ).toBe(3);
    });
  });

  describe('Lỗi validate (400)', () => {
    const expectQError = (body: ValidationErrorBody) => {
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.errors).toEqual([
        { field: 'q', message: SEARCH_LENGTH_MESSAGE },
      ]);
    };

    it('thiếu q', async () => {
      const res = await request(server()).get('/api/v1/search').expect(400);
      expectQError(res.body as ValidationErrorBody);
    });

    it('q 1 ký tự', async () => {
      const res = await search('a').expect(400);
      expectQError(res.body as ValidationErrorBody);
    });

    it('q chỉ có khoảng trắng hoặc 1 ký tự sau khi trim', async () => {
      for (const q of ['     ', '  a  ']) {
        const res = await search(q).expect(400);
        expectQError(res.body as ValidationErrorBody);
      }
    });

    it('q 101 ký tự', async () => {
      const res = await search('a'.repeat(101)).expect(400);
      expectQError(res.body as ValidationErrorBody);
    });

    it('q đúng 2 và đúng 100 ký tự thì hợp lệ', async () => {
      await search('ab').expect(200);
      await search('a'.repeat(100)).expect(200);
    });

    it('limit quá 50', async () => {
      const res = await search('docker', 'vi', { limit: 51 }).expect(400);
      expect((res.body as ValidationErrorBody).errors).toEqual([
        expect.objectContaining({ field: 'limit' }),
      ]);
    });
  });
});
