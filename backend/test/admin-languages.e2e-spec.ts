import request from 'supertest';
import { CategoryTranslation } from '../src/modules/categories/models/category-translation.model';
import { Category } from '../src/modules/categories/models/category.model';
import { Language } from '../src/modules/languages/models/language.model';
import { PostTranslation } from '../src/modules/posts/models/post-translation.model';
import { Post } from '../src/modules/posts/models/post.model';
import { UiTranslation } from '../src/modules/ui-translations/models/ui-translation.model';
import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

describe('Admin Languages (e2e)', () => {
  let ctx: TestContext;
  let token: string;
  let adminId: number;
  const server = () => ctx.app.getHttpServer();
  const api = (path = '') => `/api/v1/admin/languages${path}`;

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

  /** Một bài gốc `vi` có thêm bản dịch `en` */
  async function createPostWithEnglishTranslation() {
    const [vi, en] = [await languageId('vi'), await languageId('en')];
    const category = await Category.create({});
    const post = await Post.create({
      userId: adminId,
      languageId: vi,
      categoryId: category.id,
    });
    await PostTranslation.bulkCreate([
      {
        postId: post.id,
        languageId: vi,
        title: 'Bai viet mau',
        slug: 'bai-viet-mau',
        content: '<p>Noi dung</p>',
      },
      {
        postId: post.id,
        languageId: en,
        title: 'Sample post',
        slug: 'sample-post',
        content: '<p>Content</p>',
      },
    ]);
    return category;
  }

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
          request(server()).post(api()).send({ code: 'fr', name: 'Français' }),
        () => request(server()).patch(api('/2')).send({ name: 'X' }),
        () => request(server()).patch(api('/2/default')),
        () => request(server()).delete(api('/2')),
      ]) {
        const res = await call().set(bearer(owner.token)).expect(403);
        expect(res.body.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('GET /admin/languages', () => {
    it('trả mọi ngôn ngữ kể cả đã tắt, kèm số bản dịch bài viết', async () => {
      await Language.create({ code: 'ja', name: '日本語', isActive: false });
      await createPostWithEnglishTranslation();

      const res = await request(server())
        .get(api())
        .set(bearer(token))
        .expect(200);

      expect(res.body.message).toBe('Lấy danh sách ngôn ngữ thành công');
      expect(res.body).not.toHaveProperty('meta');
      expect(res.body.data).toEqual([
        {
          id: expect.any(Number),
          code: 'vi',
          name: 'Tiếng Việt',
          isDefault: true,
          isActive: true,
          postTranslationCount: 1,
        },
        {
          id: expect.any(Number),
          code: 'en',
          name: 'English',
          isDefault: false,
          isActive: true,
          postTranslationCount: 1,
        },
        {
          id: expect.any(Number),
          code: 'ja',
          name: '日本語',
          isDefault: false,
          isActive: false,
          postTranslationCount: 0,
        },
      ]);
    });
  });

  describe('POST /admin/languages', () => {
    it('201 và sao chép UI translation của ngôn ngữ mặc định sang ngôn ngữ mới', async () => {
      const [vi, en] = [await languageId('vi'), await languageId('en')];
      await UiTranslation.bulkCreate([
        { languageId: vi, key: 'menu.home', value: 'Trang chủ' },
        { languageId: vi, key: 'menu.about', value: 'Giới thiệu' },
        { languageId: en, key: 'menu.home', value: 'Home' },
      ]);

      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ code: 'fr', name: '  Français  ' })
        .expect(201);

      expect(res.body.data).toEqual({
        id: expect.any(Number),
        code: 'fr',
        name: 'Français',
        isDefault: false,
        isActive: true,
        postTranslationCount: 0,
      });
      const copied = await UiTranslation.findAll({
        where: { languageId: res.body.data.id as number },
        order: [['key', 'ASC']],
      });
      expect(copied.map(({ key, value }) => ({ key, value }))).toEqual([
        { key: 'menu.about', value: 'Giới thiệu' },
        { key: 'menu.home', value: 'Trang chủ' },
      ]);
    });

    it('ngôn ngữ mới hiện ngay ở GET /languages (cache đã xóa)', async () => {
      await request(server()).get('/api/v1/languages').expect(200);
      await request(server())
        .post(api())
        .set(bearer(token))
        .send({ code: 'fr', name: 'Français', isActive: true })
        .expect(201);
      const res = await request(server()).get('/api/v1/languages').expect(200);
      expect((res.body.data as { code: string }[]).map((l) => l.code)).toEqual([
        'vi',
        'en',
        'fr',
      ]);
    });

    it('409 khi mã đã có, lỗi ở field code', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ code: 'en', name: 'English' })
        .expect(409);
      expect(res.body.code).toBe('CONFLICT');
      expect(res.body.errors).toEqual([
        { field: 'code', message: 'Mã “en” đã có trong danh sách.' },
      ]);
    });

    it('400 khi mã không theo ISO 639-1, thiếu tên, isActive sai kiểu', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ code: 'EN', name: '', isActive: 'yes' })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual([
        {
          field: 'code',
          message: '2 chữ cái thường theo ISO 639-1, ví dụ: fr, ja, ko.',
        },
        { field: 'name', message: 'Vui lòng nhập trường này.' },
        { field: 'isActive', message: expect.any(String) },
      ]);
    });

    it('400 khi mã 2 chữ cái nhưng không có trong ISO 639-1, tên quá 50 ký tự', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ code: 'xx', name: 'a'.repeat(51) })
        .expect(400);
      expect(
        (res.body.errors as { field: string }[]).map((e) => e.field),
      ).toEqual(['code', 'name']);
    });
  });

  describe('PATCH /admin/languages/:id', () => {
    it('đổi tên và tắt ngôn ngữ, GET /languages không còn ngôn ngữ đó', async () => {
      const en = await languageId('en');
      await request(server()).get('/api/v1/languages').expect(200);

      const res = await request(server())
        .patch(api(`/${en}`))
        .set(bearer(token))
        .send({ name: 'Tiếng Anh', isActive: false })
        .expect(200);
      expect(res.body.data).toMatchObject({
        code: 'en',
        name: 'Tiếng Anh',
        isActive: false,
      });

      const list = await request(server()).get('/api/v1/languages').expect(200);
      expect((list.body.data as { code: string }[]).map((l) => l.code)).toEqual(
        ['vi'],
      );
    });

    it('400 khi tắt ngôn ngữ mặc định', async () => {
      const vi = await languageId('vi');
      const res = await request(server())
        .patch(api(`/${vi}`))
        .set(bearer(token))
        .send({ isActive: false })
        .expect(400);
      expect(res.body.code).toBe('BAD_REQUEST');
      expect(res.body.message).toBe('Không thể tắt ngôn ngữ mặc định');
      expect((await Language.findByPk(vi))!.isActive).toBe(true);
    });

    it('400 khi gửi code (không đổi được mã)', async () => {
      const en = await languageId('en');
      const res = await request(server())
        .patch(api(`/${en}`))
        .set(bearer(token))
        .send({ code: 'fr' })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'code', message: expect.any(String) },
      ]);
    });

    it('404 khi không có ngôn ngữ', async () => {
      const res = await request(server())
        .patch(api('/9999'))
        .set(bearer(token))
        .send({ name: 'X' })
        .expect(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /admin/languages/:id/default', () => {
    it('đặt mặc định mới, ngôn ngữ cũ tự bỏ mặc định', async () => {
      const en = await languageId('en');
      const res = await request(server())
        .patch(api(`/${en}/default`))
        .set(bearer(token))
        .expect(200);
      expect(res.body.data).toMatchObject({ code: 'en', isDefault: true });

      const defaults = await Language.findAll({ where: { isDefault: true } });
      expect(defaults.map((language) => language.code)).toEqual(['en']);
      // Ngôn ngữ mặc định đứng đầu ở API public
      const list = await request(server()).get('/api/v1/languages').expect(200);
      expect(list.body.data[0]).toMatchObject({ code: 'en', isDefault: true });
    });

    it('400 khi ngôn ngữ đang tắt', async () => {
      const ja = await Language.create({
        code: 'ja',
        name: '日本語',
        isActive: false,
      });
      const res = await request(server())
        .patch(api(`/${ja.id}/default`))
        .set(bearer(token))
        .expect(400);
      expect(res.body.message).toBe('Bật ngôn ngữ trước khi đặt làm mặc định');
      expect(await Language.count({ where: { isDefault: true } })).toBe(1);
    });

    it('404 khi không có ngôn ngữ', async () => {
      await request(server())
        .patch(api('/9999/default'))
        .set(bearer(token))
        .expect(404);
    });
  });

  describe('DELETE /admin/languages/:id', () => {
    it('xóa ngôn ngữ chưa dùng, cascade tên danh mục và UI translation', async () => {
      const ja = await Language.create({ code: 'ja', name: '日本語' });
      const category = await Category.create({});
      await CategoryTranslation.create({
        categoryId: category.id,
        languageId: ja.id,
        name: '旅行',
        slug: 'ryoko',
      });
      await UiTranslation.create({
        languageId: ja.id,
        key: 'menu.home',
        value: 'ホーム',
      });

      const res = await request(server())
        .delete(api(`/${ja.id}`))
        .set(bearer(token))
        .expect(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Đã xóa ngôn ngữ.',
        data: null,
      });
      expect(await Language.findByPk(ja.id)).toBeNull();
      expect(
        await CategoryTranslation.count({ where: { languageId: ja.id } }),
      ).toBe(0);
      expect(await UiTranslation.count({ where: { languageId: ja.id } })).toBe(
        0,
      );
    });

    it('400 khi xóa ngôn ngữ mặc định', async () => {
      const vi = await languageId('vi');
      const res = await request(server())
        .delete(api(`/${vi}`))
        .set(bearer(token))
        .expect(400);
      expect(res.body.message).toBe('Không thể xóa ngôn ngữ mặc định');
    });

    it('409 LANGUAGE_IN_USE khi đang có bản dịch bài viết', async () => {
      await createPostWithEnglishTranslation();
      const en = await languageId('en');
      const res = await request(server())
        .delete(api(`/${en}`))
        .set(bearer(token))
        .expect(409);
      expect(res.body.code).toBe('LANGUAGE_IN_USE');
      expect(await Language.findByPk(en)).not.toBeNull();
    });

    it('404 khi không có ngôn ngữ', async () => {
      await request(server())
        .delete(api('/9999'))
        .set(bearer(token))
        .expect(404);
    });
  });
});
