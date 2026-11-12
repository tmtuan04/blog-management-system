import request from 'supertest';
import { Language } from '../src/modules/languages/models/language.model';
import { UiTranslation } from '../src/modules/ui-translations/models/ui-translation.model';
import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { flushRedis, resetDatabase } from './helpers/db';

describe('UI Translations (e2e)', () => {
  let ctx: TestContext;
  let token: string;
  let vi: number;
  let en: number;
  const server = () => ctx.app.getHttpServer();
  const api = (path = '') => `/api/v1/admin/ui-translations${path}`;
  const publicApi = (code: string) => `/api/v1/ui-translations/${code}`;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    token = (await tokenFor(ctx.app, 'super_admin')).token;
    vi = (await Language.findOne({ where: { code: 'vi' } }))!.id;
    en = (await Language.findOne({ where: { code: 'en' } }))!.id;
    await UiTranslation.bulkCreate([
      { languageId: vi, key: 'menu.home', value: 'Trang chủ' },
      { languageId: en, key: 'menu.home', value: 'Home' },
      { languageId: vi, key: 'menu.about', value: 'Giới thiệu' },
      { languageId: vi, key: 'post.read_more', value: 'Đọc tiếp' },
      { languageId: en, key: 'post.read_more', value: 'Read more' },
    ]);
  });

  afterAll(() => ctx.app.close());

  describe('GET /ui-translations/:code', () => {
    it('không cần đăng nhập, key chưa dịch dùng giá trị của ngôn ngữ mặc định', async () => {
      const res = await request(server()).get(publicApi('en')).expect(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Lấy bản dịch giao diện thành công',
        data: {
          'menu.about': 'Giới thiệu',
          'menu.home': 'Home',
          'post.read_more': 'Read more',
        },
      });
    });

    it('ngôn ngữ mặc định trả đúng giá trị của nó', async () => {
      const res = await request(server()).get(publicApi('vi')).expect(200);
      expect(res.body.data['menu.home']).toBe('Trang chủ');
    });

    it('404 khi mã không có hoặc ngôn ngữ đã tắt', async () => {
      await request(server()).get(publicApi('ja')).expect(404);
      await Language.update({ isActive: false }, { where: { code: 'en' } });
      await flushRedis(ctx.app);
      const res = await request(server()).get(publicApi('en')).expect(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('lưu cache cache:ui:{code}', async () => {
      await request(server()).get(publicApi('en')).expect(200);
      // Sửa DB mà không xóa cache thì vẫn trả dữ liệu cũ
      await UiTranslation.update(
        { value: 'Homepage' },
        { where: { key: 'menu.home', languageId: en } },
      );
      const res = await request(server()).get(publicApi('en')).expect(200);
      expect(res.body.data['menu.home']).toBe('Home');
    });
  });

  describe('quyền truy cập admin', () => {
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
            .send({ key: 'menu.blog', values: { vi: 'Blog' } }),
        () =>
          request(server()).put(api('/menu.home/en')).send({ value: 'Home' }),
        () => request(server()).delete(api('/menu.home')),
      ]) {
        const res = await call().set(bearer(owner.token)).expect(403);
        expect(res.body.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('GET /admin/ui-translations', () => {
    it('mỗi dòng một key xếp theo key, mặc định 50 key mỗi trang', async () => {
      const res = await request(server())
        .get(api())
        .set(bearer(token))
        .expect(200);
      expect(res.body.data).toEqual([
        { key: 'menu.about', values: { vi: 'Giới thiệu', en: null } },
        { key: 'menu.home', values: { vi: 'Trang chủ', en: 'Home' } },
        { key: 'post.read_more', values: { vi: 'Đọc tiếp', en: 'Read more' } },
      ]);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 50,
        total: 3,
        totalPages: 1,
      });
    });

    it('phân trang theo key, không theo số dòng trong bảng', async () => {
      const res = await request(server())
        .get(api())
        .query({ page: 2, limit: 2 })
        .set(bearer(token))
        .expect(200);
      expect(
        (res.body.data as { key: string }[]).map((row) => row.key),
      ).toEqual(['post.read_more']);
      expect(res.body.meta).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('?q= tìm theo key hoặc theo giá trị, vẫn trả đủ giá trị các ngôn ngữ', async () => {
      const byKey = await request(server())
        .get(api())
        .query({ q: 'menu.' })
        .set(bearer(token))
        .expect(200);
      expect(
        (byKey.body.data as { key: string }[]).map((row) => row.key),
      ).toEqual(['menu.about', 'menu.home']);

      const byValue = await request(server())
        .get(api())
        .query({ q: 'read more' })
        .set(bearer(token))
        .expect(200);
      expect(byValue.body.data).toEqual([
        { key: 'post.read_more', values: { vi: 'Đọc tiếp', en: 'Read more' } },
      ]);
      expect(byValue.body.meta.total).toBe(1);
    });

    it('ký tự % và _ trong từ khóa được tìm đúng chữ', async () => {
      const res = await request(server())
        .get(api())
        .query({ q: '%' })
        .set(bearer(token))
        .expect(200);
      expect(res.body.data).toEqual([]);
    });

    it('400 khi limit quá 50', async () => {
      const res = await request(server())
        .get(api())
        .query({ limit: 51 })
        .set(bearer(token))
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'limit', message: expect.any(String) },
      ]);
    });
  });

  describe('POST /admin/ui-translations', () => {
    it('201, bỏ qua ô trống, API public thấy key mới ngay (cache đã xóa)', async () => {
      await request(server()).get(publicApi('en')).expect(200);

      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ key: 'menu.blog', values: { vi: ' Blog ', en: '' } })
        .expect(201);
      expect(res.body.data).toEqual({
        key: 'menu.blog',
        values: { vi: 'Blog', en: null },
      });
      expect(await UiTranslation.count({ where: { key: 'menu.blog' } })).toBe(
        1,
      );

      const publicRes = await request(server())
        .get(publicApi('en'))
        .expect(200);
      expect(publicRes.body.data['menu.blog']).toBe('Blog');
    });

    it('409 khi key đã có, lỗi ở field key', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ key: 'menu.home', values: { vi: 'Trang chủ' } })
        .expect(409);
      expect(res.body.code).toBe('CONFLICT');
      expect(res.body.errors).toEqual([
        {
          field: 'key',
          message:
            'Key “menu.home” đã có. Tìm key đó trong bảng để sửa giá trị.',
        },
      ]);
    });

    it('400 khi key sai dạng nhóm.tên', async () => {
      for (const key of ['menu', 'Menu.Home', 'menu..home', 'menu.home-page']) {
        const res = await request(server())
          .post(api())
          .set(bearer(token))
          .send({ key, values: { vi: 'x' } })
          .expect(400);
        expect(res.body.errors).toEqual([
          { field: 'key', message: expect.any(String) },
        ]);
      }
    });

    it('400 ở values.vi khi thiếu giá trị của ngôn ngữ mặc định', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ key: 'menu.blog', values: { en: 'Blog' } })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'values.vi', message: 'Vui lòng nhập trường này.' },
      ]);
    });

    it('400 ở values.ja khi mã ngôn ngữ không có', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ key: 'menu.blog', values: { vi: 'Blog', ja: 'ブログ' } })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'values.ja', message: expect.any(String) },
      ]);
    });
  });

  describe('PUT /admin/ui-translations/:key/:code', () => {
    it('sửa ô đã có, API public thấy giá trị mới ngay', async () => {
      await request(server()).get(publicApi('en')).expect(200);

      const res = await request(server())
        .put(api('/menu.home/en'))
        .set(bearer(token))
        .send({ value: 'Homepage' })
        .expect(200);
      expect(res.body.data).toEqual({
        key: 'menu.home',
        values: { vi: 'Trang chủ', en: 'Homepage' },
      });

      const publicRes = await request(server())
        .get(publicApi('en'))
        .expect(200);
      expect(publicRes.body.data['menu.home']).toBe('Homepage');
    });

    it('ô chưa dịch thì tạo dòng mới', async () => {
      const res = await request(server())
        .put(api('/menu.about/en'))
        .set(bearer(token))
        .send({ value: 'About us' })
        .expect(200);
      expect(res.body.data.values).toEqual({
        vi: 'Giới thiệu',
        en: 'About us',
      });
    });

    it('giá trị rỗng ở ngôn ngữ không mặc định thì xóa dòng, public dùng giá trị mặc định', async () => {
      const res = await request(server())
        .put(api('/menu.home/en'))
        .set(bearer(token))
        .send({ value: '   ' })
        .expect(200);
      expect(res.body.data.values).toEqual({ vi: 'Trang chủ', en: null });
      expect(
        await UiTranslation.count({
          where: { key: 'menu.home', languageId: en },
        }),
      ).toBe(0);

      const publicRes = await request(server())
        .get(publicApi('en'))
        .expect(200);
      expect(publicRes.body.data['menu.home']).toBe('Trang chủ');
    });

    it('400 ở field value khi để rỗng ngôn ngữ mặc định', async () => {
      const res = await request(server())
        .put(api('/menu.home/vi'))
        .set(bearer(token))
        .send({ value: '' })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'value', message: 'Vui lòng nhập trường này.' },
      ]);
      expect(
        await UiTranslation.count({
          where: { key: 'menu.home', languageId: vi },
        }),
      ).toBe(1);
    });

    it('400 khi giá trị quá 255 ký tự hoặc thiếu value', async () => {
      await request(server())
        .put(api('/menu.home/en'))
        .set(bearer(token))
        .send({ value: 'a'.repeat(256) })
        .expect(400);
      const res = await request(server())
        .put(api('/menu.home/en'))
        .set(bearer(token))
        .send({})
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'value', message: expect.any(String) },
      ]);
    });

    it('404 khi key hoặc ngôn ngữ không có', async () => {
      await request(server())
        .put(api('/menu.none/en'))
        .set(bearer(token))
        .send({ value: 'x' })
        .expect(404);
      await request(server())
        .put(api('/menu.home/ja'))
        .set(bearer(token))
        .send({ value: 'x' })
        .expect(404);
    });
  });

  describe('DELETE /admin/ui-translations/:key', () => {
    it('xóa key ở mọi ngôn ngữ, API public không còn key đó', async () => {
      await request(server()).get(publicApi('en')).expect(200);

      const res = await request(server())
        .delete(api('/menu.home'))
        .set(bearer(token))
        .expect(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Đã xóa key.',
        data: null,
      });
      expect(await UiTranslation.count({ where: { key: 'menu.home' } })).toBe(
        0,
      );

      const publicRes = await request(server())
        .get(publicApi('en'))
        .expect(200);
      expect(publicRes.body.data).not.toHaveProperty('menu.home');
    });

    it('404 khi key không có', async () => {
      const res = await request(server())
        .delete(api('/menu.none'))
        .set(bearer(token))
        .expect(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
