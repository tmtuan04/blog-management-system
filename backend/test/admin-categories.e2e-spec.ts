import request from 'supertest';
import { CategoryTranslation } from '../src/modules/categories/models/category-translation.model';
import { Category } from '../src/modules/categories/models/category.model';
import { Language } from '../src/modules/languages/models/language.model';
import { Post } from '../src/modules/posts/models/post.model';
import { RedisService } from '../src/infra/redis/redis.service';
import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

describe('Admin Categories (e2e)', () => {
  let ctx: TestContext;
  let token: string;
  let adminId: number;
  const server = () => ctx.app.getHttpServer();
  const api = (path = '') => `/api/v1/admin/categories${path}`;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    const admin = await tokenFor(ctx.app, 'super_admin');
    token = admin.token;
    adminId = admin.user.id;
  });

  afterAll(() => ctx.app.close());

  const languageId = async (code: string) =>
    (await Language.findOne({ where: { code } }))!.id;

  /** Tạo danh mục qua API, trả id */
  const createCategory = async (names: Record<string, string>) => {
    const res = await request(server())
      .post(api())
      .set(bearer(token))
      .send({ names })
      .expect(201);
    return res.body.data.id as number;
  };

  describe('quyền truy cập', () => {
    it('401 khi không có token', async () => {
      const res = await request(server()).get(api()).expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('403 khi là Blog Owner', async () => {
      const owner = await tokenFor(ctx.app, 'blog_owner');
      for (const call of [
        () => request(server()).get(api()),
        () =>
          request(server())
            .post(api())
            .send({ names: { vi: 'Du lịch' } }),
        () =>
          request(server())
            .patch(api('/1'))
            .send({ names: { vi: 'X1' } }),
        () => request(server()).delete(api('/1')),
      ]) {
        const res = await call().set(bearer(owner.token)).expect(403);
        expect(res.body.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('POST /admin/categories', () => {
    it('tạo danh mục, slug tự sinh, tên rỗng thì không có bản dịch', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ names: { vi: 'Lập trình', en: '' } })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        message: 'Thêm danh mục thành công',
        data: {
          id: expect.any(Number),
          translations: [{ code: 'vi', name: 'Lập trình', slug: 'lap-trinh' }],
          postCount: 0,
        },
      });
      expect(
        await CategoryTranslation.count({
          where: { categoryId: res.body.data.id },
        }),
      ).toBe(1);
    });

    it('slug trùng trong cùng ngôn ngữ thì thêm -2, khác ngôn ngữ thì không', async () => {
      await createCategory({ vi: 'Travel' });
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ names: { vi: 'Travel!', en: 'Travel' } })
        .expect(201);
      expect(res.body.data.translations).toEqual([
        { code: 'vi', name: 'Travel!', slug: 'travel-2' },
        { code: 'en', name: 'Travel', slug: 'travel' },
      ]);
    });

    it('400 khi thiếu tên ngôn ngữ mặc định, lỗi ở field names.vi', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ names: { en: 'Travel' } })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual([
        {
          field: 'names.vi',
          message: 'Nhập tên danh mục ở ngôn ngữ mặc định (Tiếng Việt).',
        },
      ]);
      expect(await Category.count()).toBe(0);
    });

    it('400 khi tên quá dài hoặc mã ngôn ngữ không có', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ names: { vi: 'x'.repeat(151), fr: 'Voyage' } })
        .expect(400);
      const fields = (res.body.errors as { field: string }[]).map(
        (e) => e.field,
      );
      expect(fields).toEqual(['names.vi', 'names.fr']);
    });

    it('400 khi thiếu names', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({})
        .expect(400);
      expect(res.body.errors[0].field).toBe('names');
    });
  });

  describe('GET /admin/categories', () => {
    it('phân trang, kèm số bài mọi trạng thái, mặc định đứng đầu', async () => {
      const first = await createCategory({
        vi: 'Lập trình',
        en: 'Programming',
      });
      await createCategory({ vi: 'Du lịch' });
      await Post.create({
        userId: adminId,
        languageId: await languageId('vi'),
        categoryId: first,
      });

      const res = await request(server())
        .get(api('?page=1&limit=1'))
        .set(bearer(token))
        .expect(200);

      expect(res.body.meta).toEqual({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      });
      expect(res.body.data).toEqual([
        {
          id: first,
          translations: [
            { code: 'vi', name: 'Lập trình', slug: 'lap-trinh' },
            { code: 'en', name: 'Programming', slug: 'programming' },
          ],
          postCount: 1,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ]);
    });

    it('q tìm theo tên ở mọi ngôn ngữ', async () => {
      await createCategory({ vi: 'Lập trình', en: 'Programming' });
      const travel = await createCategory({ vi: 'Du lịch', en: 'Travel' });

      const res = await request(server())
        .get(api('?q=trav'))
        .set(bearer(token))
        .expect(200);
      const ids = (res.body.data as { id: number }[]).map((c) => c.id);
      expect(ids).toEqual([travel]);
      expect(res.body.meta.total).toBe(1);
    });

    it('400 khi limit quá 50', async () => {
      const res = await request(server())
        .get(api('?limit=51'))
        .set(bearer(token))
        .expect(400);
      expect(res.body.errors[0].field).toBe('limit');
    });
  });

  describe('PATCH /admin/categories/:id', () => {
    it('đổi tên thì sinh lại slug, tên rỗng thì xóa bản dịch', async () => {
      const id = await createCategory({ vi: 'Lập trình', en: 'Programming' });

      const res = await request(server())
        .patch(api(`/${id}`))
        .set(bearer(token))
        .send({ names: { vi: 'Lập trình web', en: '' } })
        .expect(200);

      expect(res.body.message).toBe('Cập nhật danh mục thành công');
      expect(res.body.data.translations).toEqual([
        { code: 'vi', name: 'Lập trình web', slug: 'lap-trinh-web' },
      ]);
    });

    it('giữ nguyên slug khi tên không đổi', async () => {
      const id = await createCategory({ vi: 'Du lịch' });
      const res = await request(server())
        .patch(api(`/${id}`))
        .set(bearer(token))
        .send({ names: { vi: 'Du lịch', en: 'Travel' } })
        .expect(200);
      expect(res.body.data.translations).toEqual([
        { code: 'vi', name: 'Du lịch', slug: 'du-lich' },
        { code: 'en', name: 'Travel', slug: 'travel' },
      ]);
    });

    it('400 khi xóa tên ngôn ngữ mặc định', async () => {
      const id = await createCategory({ vi: 'Du lịch' });
      const res = await request(server())
        .patch(api(`/${id}`))
        .set(bearer(token))
        .send({ names: { vi: '' } })
        .expect(400);
      expect(res.body.errors[0].field).toBe('names.vi');
    });

    it('404 khi không có danh mục', async () => {
      const res = await request(server())
        .patch(api('/999'))
        .set(bearer(token))
        .send({ names: { vi: 'Du lịch' } })
        .expect(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('xóa cache cache:categories: và cache:posts:', async () => {
      const id = await createCategory({ vi: 'Du lịch' });
      const redis = ctx.app.get(RedisService).client;
      await redis.set('cache:categories:test', '1');
      await redis.set('cache:posts:test', '1');

      await request(server())
        .patch(api(`/${id}`))
        .set(bearer(token))
        .send({ names: { vi: 'Du lịch 2' } })
        .expect(200);

      expect(await redis.exists('cache:categories:test')).toBe(0);
      expect(await redis.exists('cache:posts:test')).toBe(0);
    });
  });

  describe('DELETE /admin/categories/:id', () => {
    it('xóa danh mục không còn bài, bản dịch xóa theo', async () => {
      const id = await createCategory({ vi: 'Du lịch', en: 'Travel' });
      const res = await request(server())
        .delete(api(`/${id}`))
        .set(bearer(token))
        .expect(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Đã xóa danh mục.',
        data: null,
      });
      expect(await Category.count()).toBe(0);
      expect(await CategoryTranslation.count()).toBe(0);
    });

    it('409 CATEGORY_IN_USE khi còn bài', async () => {
      const id = await createCategory({ vi: 'Du lịch' });
      await Post.create({
        userId: adminId,
        languageId: await languageId('vi'),
        categoryId: id,
      });
      const res = await request(server())
        .delete(api(`/${id}`))
        .set(bearer(token))
        .expect(409);
      expect(res.body.code).toBe('CATEGORY_IN_USE');
      expect(await Category.count()).toBe(1);
    });

    it('404 khi không có danh mục', async () => {
      await request(server())
        .delete(api('/999'))
        .set(bearer(token))
        .expect(404);
    });
  });
});
