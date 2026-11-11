import request from 'supertest';
import { CategoryTranslation } from '../src/modules/categories/models/category-translation.model';
import { Category } from '../src/modules/categories/models/category.model';
import { Language } from '../src/modules/languages/models/language.model';
import { PostTranslation } from '../src/modules/posts/models/post-translation.model';
import { Post } from '../src/modules/posts/models/post.model';
import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';
import { PNG_1PX } from './helpers/fixtures';

describe('Admin Posts (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const api = (path = '') => `/api/v1/admin/posts${path}`;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(() => resetDatabase(ctx.app));

  afterAll(() => ctx.app.close());

  async function createCategory(name = 'Du lịch') {
    const vi = await Language.findOne({ where: { code: 'vi' } });
    const category = await Category.create({});
    await CategoryTranslation.create({
      categoryId: category.id,
      languageId: vi!.id,
      name,
      slug: name
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    });
    return category;
  }

  async function uploadThumbnail(token: string): Promise<string> {
    const res = await request(server())
      .post('/api/v1/uploads/images')
      .set(bearer(token))
      .attach('file', PNG_1PX, 'anh.png')
      .expect(201);
    return res.body.data.path as string;
  }

  const translationBody = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    title: 'Bai viet mau hop le',
    excerpt: 'Tom tat ngan',
    content: '<p>Noi dung bai viet</p>',
    status: 'draft',
    ...overrides,
  });

  describe('quyền truy cập', () => {
    it('401 khi không có token', async () => {
      const res = await request(server()).get(api()).expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('403 khi role user', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .get(api())
        .set(bearer(token))
        .expect(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /admin/posts', () => {
    it('201 tạo bài + bản gốc, Super Admin cũng tạo được', async () => {
      const { token, user } = await tokenFor(ctx.app, 'super_admin');
      const category = await createCategory();

      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody({ status: 'published' }),
        })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        message: 'Tạo bài viết thành công',
        data: {
          languageCode: 'vi',
          category: { id: category.id, name: 'Du lịch' },
          thumbnail: null,
          translations: [
            {
              code: 'vi',
              isOriginal: true,
              title: 'Bai viet mau hop le',
              slug: 'bai-viet-mau-hop-le',
              excerpt: 'Tom tat ngan',
              content: '<p>Noi dung bai viet</p>',
              status: 'published',
              viewCount: 0,
              publishedAt: expect.any(String),
            },
          ],
        },
      });

      const post = await Post.findByPk(res.body.data.id);
      expect(post!.userId).toBe(user.id);
      const count = await PostTranslation.count({
        where: { postId: post!.id },
      });
      expect(count).toBe(1);
    });

    it('400 khi tiêu đề quá ngắn (DTO)', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: {
            title: 'abc',
            content: '<p>Noi dung</p>',
            status: 'draft',
          },
        })
        .expect(400);
      expect(res.body.errors).toEqual([
        {
          field: 'translation.title',
          message: 'Tiêu đề cần từ 5 đến 255 ký tự.',
        },
      ]);
    });

    it('400 khi nội dung rỗng sau sanitize (service)', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: {
            title: 'Bai viet mau hop le',
            content: '<script>alert(1)</script>',
            status: 'draft',
          },
        })
        .expect(400);
      expect(res.body.errors).toEqual([
        {
          field: 'translation.content',
          message: 'Nhập nội dung bài viết.',
        },
      ]);
    });

    it('400 khi ngôn ngữ đã tắt', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();
      await Language.update({ isActive: false }, { where: { code: 'en' } });

      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'en',
          categoryId: category.id,
          translation: translationBody(),
        })
        .expect(400);
      expect(res.body.errors).toEqual([
        {
          field: 'languageCode',
          message: 'Ngôn ngữ không tồn tại hoặc đã tắt.',
        },
      ]);
    });

    it('400 khi danh mục không tồn tại', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'vi',
          categoryId: 9999,
          translation: translationBody(),
        })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'categoryId', message: 'Chọn danh mục cho bài viết.' },
      ]);
    });

    it('lọc XSS trong nội dung', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody({
            content: '<p>An toan</p><script>alert(1)</script>',
          }),
        })
        .expect(201);
      expect(res.body.data.translations[0].content).toBe('<p>An toan</p>');
    });
  });

  describe('GET /admin/posts và /:id', () => {
    it('chỉ liệt kê bài của chính mình, lọc status/q', async () => {
      const owner = await tokenFor(ctx.app, 'blog_owner');
      const other = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();

      const mineDraft = await request(server())
        .post(api())
        .set(bearer(owner.token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody({
            title: 'Bai nhap cua toi',
            status: 'draft',
          }),
        })
        .expect(201);

      await request(server())
        .post(api())
        .set(bearer(owner.token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody({
            title: 'Bai dang cua toi',
            status: 'published',
          }),
        })
        .expect(201);

      await request(server())
        .post(api())
        .set(bearer(other.token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody({ title: 'Bai cua nguoi khac' }),
        })
        .expect(201);

      const allMine = await request(server())
        .get(api())
        .set(bearer(owner.token))
        .expect(200);
      expect(allMine.body.meta.total).toBe(2);
      expect(
        allMine.body.data.every(
          (row: { title: string }) => !row.title.includes('nguoi khac'),
        ),
      ).toBe(true);

      const drafts = await request(server())
        .get(api())
        .query({ status: 'draft' })
        .set(bearer(owner.token))
        .expect(200);
      expect(drafts.body.data).toHaveLength(1);
      expect(drafts.body.data[0].id).toBe(mineDraft.body.data.id);

      const search = await request(server())
        .get(api())
        .query({ q: 'dang cua' })
        .set(bearer(owner.token))
        .expect(200);
      expect(search.body.data).toHaveLength(1);
      expect(search.body.data[0].title).toBe('Bai dang cua toi');
    });

    it('403 khi xem bài của người khác, 404 khi không tồn tại', async () => {
      const owner = await tokenFor(ctx.app, 'blog_owner');
      const other = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();
      const created = await request(server())
        .post(api())
        .set(bearer(owner.token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody(),
        })
        .expect(201);

      const forbidden = await request(server())
        .get(api(`/${created.body.data.id}`))
        .set(bearer(other.token))
        .expect(403);
      expect(forbidden.body.code).toBe('FORBIDDEN');

      const missing = await request(server())
        .get(api('/999999'))
        .set(bearer(owner.token))
        .expect(404);
      expect(missing.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /admin/posts/:id', () => {
    it('đổi danh mục và thumbnail; null thì bỏ ảnh', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();
      const otherCategory = await createCategory('Ẩm thực');
      const thumbnail = await uploadThumbnail(token);

      const created = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          thumbnail,
          translation: translationBody(),
        })
        .expect(201);
      expect(created.body.data.thumbnail).toBe(thumbnail);

      const updated = await request(server())
        .patch(api(`/${created.body.data.id}`))
        .set(bearer(token))
        .send({ categoryId: otherCategory.id })
        .expect(200);
      expect(updated.body.data.category).toEqual({
        id: otherCategory.id,
        name: 'Ẩm thực',
      });
      expect(updated.body.data.thumbnail).toBe(thumbnail);

      const cleared = await request(server())
        .patch(api(`/${created.body.data.id}`))
        .set(bearer(token))
        .send({ thumbnail: null })
        .expect(200);
      expect(cleared.body.data.thumbnail).toBeNull();
      expect(cleared.body.message).toBe('Cập nhật bài viết thành công');
    });
  });

  describe('DELETE /admin/posts/:id', () => {
    it('xóa bài và bản dịch; 403 với bài người khác', async () => {
      const owner = await tokenFor(ctx.app, 'blog_owner');
      const other = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();
      const created = await request(server())
        .post(api())
        .set(bearer(owner.token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody(),
        })
        .expect(201);
      const id = created.body.data.id as number;

      await request(server())
        .delete(api(`/${id}`))
        .set(bearer(other.token))
        .expect(403);

      const deleted = await request(server())
        .delete(api(`/${id}`))
        .set(bearer(owner.token))
        .expect(200);
      expect(deleted.body).toEqual({
        success: true,
        message: 'Đã xóa bài viết.',
        data: null,
      });

      expect(await Post.findByPk(id)).toBeNull();
      expect(await PostTranslation.count({ where: { postId: id } })).toBe(0);
    });
  });

  describe('bản dịch', () => {
    /** Tạo bài bản gốc `vi`, rồi thêm từng bản dịch bằng route riêng như phase 4 */
    async function createPost(
      token: string,
      translationCodes: string[] = [],
    ): Promise<number> {
      const category = await createCategory();
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody(),
        })
        .expect(201);
      const id = res.body.data.id as number;
      for (const languageCode of translationCodes) {
        await request(server())
          .post(api(`/${id}/translations`))
          .set(bearer(token))
          .send({ languageCode, ...translationBody() })
          .expect(201);
      }
      return id;
    }

    it('POST /admin/posts không nhận translations[] (bản dịch thêm bằng route riêng)', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const category = await createCategory();
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          languageCode: 'vi',
          categoryId: category.id,
          translation: translationBody(),
          translations: [{ languageCode: 'en', ...translationBody() }],
        })
        .expect(400);

      expect(res.body.errors).toEqual([
        { field: 'translations', message: 'Trường này không được phép' },
      ]);
      expect(await Post.count()).toBe(0);
    });

    it('một bản dịch lỗi không ảnh hưởng bài và các bản đã lưu', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const id = await createPost(token, ['en']);

      const invalid = await request(server())
        .post(api(`/${id}/translations`))
        .set(bearer(token))
        .send({ languageCode: 'ja', ...translationBody({ title: 'abc' }) })
        .expect(400);
      expect(invalid.body.errors).toEqual([
        { field: 'title', message: 'Tiêu đề cần từ 5 đến 255 ký tự.' },
      ]);

      const detail = await request(server())
        .get(api(`/${id}`))
        .set(bearer(token))
        .expect(200);
      const codes = (detail.body.data.translations as { code: string }[]).map(
        (t) => t.code,
      );
      expect(codes).toEqual(['vi', 'en']);
    });

    it('POST /:id/translations: ngôn ngữ gốc → 409 ở languageCode', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const id = await createPost(token);
      const res = await request(server())
        .post(api(`/${id}/translations`))
        .set(bearer(token))
        .send({ languageCode: 'vi', ...translationBody() })
        .expect(409);
      expect(res.body.errors).toEqual([
        {
          field: 'languageCode',
          message: 'Bài viết đã có bản dịch ở ngôn ngữ này.',
        },
      ]);
    });

    it('POST /:id/translations: 201, trùng ngôn ngữ 409, bài người khác 403, không có bài 404', async () => {
      const owner = await tokenFor(ctx.app, 'blog_owner');
      const other = await tokenFor(ctx.app, 'blog_owner');
      const id = await createPost(owner.token);
      const body = {
        languageCode: 'en',
        ...translationBody({ title: 'English version' }),
      };

      const created = await request(server())
        .post(api(`/${id}/translations`))
        .set(bearer(owner.token))
        .send(body)
        .expect(201);
      expect(created.body.message).toBe('Thêm bản dịch thành công');
      const codes = (created.body.data.translations as { code: string }[]).map(
        (t) => t.code,
      );
      expect(codes).toEqual(['vi', 'en']);

      const duplicate = await request(server())
        .post(api(`/${id}/translations`))
        .set(bearer(owner.token))
        .send(body)
        .expect(409);
      expect(duplicate.body.code).toBe('CONFLICT');
      expect(duplicate.body.errors).toEqual([
        {
          field: 'languageCode',
          message: 'Bài viết đã có bản dịch ở ngôn ngữ này.',
        },
      ]);

      await request(server())
        .post(api(`/${id}/translations`))
        .set(bearer(other.token))
        .send(body)
        .expect(403);

      await request(server())
        .post(api('/999999/translations'))
        .set(bearer(owner.token))
        .send(body)
        .expect(404);
    });

    it('PATCH /:id/translations/:code: sinh lại slug, publishedAt chỉ ghi lần đầu', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const id = await createPost(token, ['en']);
      const patch = (body: Record<string, unknown>) =>
        request(server())
          .patch(api(`/${id}/translations/en`))
          .set(bearer(token))
          .send(body)
          .expect(200);
      const english = (res: request.Response) =>
        (res.body.data.translations as { code: string }[]).find(
          (t) => t.code === 'en',
        ) as Record<string, unknown>;

      const renamed = await patch({ title: 'Updated English title' });
      expect(renamed.body.message).toBe('Cập nhật bản dịch thành công');
      expect(english(renamed)).toMatchObject({
        title: 'Updated English title',
        slug: 'updated-english-title',
        publishedAt: null,
      });

      const published = await patch({ status: 'published' });
      const firstPublishedAt = english(published).publishedAt;
      expect(firstPublishedAt).toEqual(expect.any(String));

      await patch({ status: 'archived' });
      const republished = await patch({ status: 'published' });
      expect(english(republished).publishedAt).toBe(firstPublishedAt);

      await request(server())
        .patch(api(`/${id}/translations/ja`))
        .set(bearer(token))
        .send({ title: 'Khong co ban dich' })
        .expect(404);
    });

    it('DELETE /:id/translations/:code: bản gốc 400, bản dịch xóa kèm bình luận', async () => {
      const { token, user } = await tokenFor(ctx.app, 'blog_owner');
      const id = await createPost(token, ['en']);
      const en = await PostTranslation.findOne({
        where: {
          postId: id,
          languageId: (await Language.findOne({ where: { code: 'en' } }))!.id,
        },
      });
      await PostTranslation.sequelize!.query(
        'INSERT INTO comments (post_translation_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        { replacements: [en!.id, user.id, 'Binh luan thu'] },
      );

      const original = await request(server())
        .delete(api(`/${id}/translations/vi`))
        .set(bearer(token))
        .expect(400);
      expect(original.body.code).toBe('ORIGINAL_TRANSLATION_REQUIRED');

      const deleted = await request(server())
        .delete(api(`/${id}/translations/en`))
        .set(bearer(token))
        .expect(200);
      expect(deleted.body).toEqual({
        success: true,
        message: 'Đã xóa bản dịch.',
        data: null,
      });

      expect(await PostTranslation.count({ where: { postId: id } })).toBe(1);
      const [rows] = await PostTranslation.sequelize!.query(
        'SELECT COUNT(*) AS total FROM comments WHERE post_translation_id = ?',
        { replacements: [en!.id] },
      );
      expect(Number((rows as { total: number }[])[0].total)).toBe(0);
    });
  });
});
