import request from 'supertest';
import { PageTranslation } from '../src/modules/pages/models/page-translation.model';
import { Page } from '../src/modules/pages/models/page.model';
import { Language } from '../src/modules/languages/models/language.model';
import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

describe('Admin Pages UC18 (e2e)', () => {
  let ctx: TestContext;
  let token: string;
  const server = () => ctx.app.getHttpServer();
  const api = (path = '') => `/api/v1/admin/pages${path}`;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    token = (await tokenFor(ctx.app, 'super_admin')).token;
    const vi = (await Language.findOne({ where: { code: 'vi' } }))!;
    const about = await Page.create({ key: 'about', isVisible: true });
    await Page.create({ key: 'contact', isVisible: false });
    await PageTranslation.create({
      pageId: about.id,
      languageId: vi.id,
      title: 'Giới thiệu',
      content: '<p>Xin chào</p>',
    });
  });

  afterAll(() => ctx.app.close());

  const put = (key: string, body: object) =>
    request(server())
      .put(api(`/${key}`))
      .set(bearer(token))
      .send(body);

  const fieldsOf = (body: { errors?: { field: string }[] }) =>
    (body.errors ?? []).map((e) => e.field).sort();

  const vi = {
    code: 'vi',
    title: 'Giới thiệu mới',
    content: '<p>Nội dung</p>',
  };

  describe('quyền truy cập', () => {
    it('401 khi không có token', async () => {
      const res = await request(server()).get(api()).expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('403 khi là Blog Owner hoặc User, ở cả 3 route', async () => {
      for (const role of ['blog_owner', 'user'] as const) {
        const caller = await tokenFor(ctx.app, role);
        for (const call of [
          () => request(server()).get(api()),
          () => request(server()).get(api('/about')),
          () =>
            request(server())
              .put(api('/about'))
              .send({ isVisible: true, translations: [vi] }),
        ]) {
          const res = await call().set(bearer(caller.token)).expect(403);
          expect(res.body.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  describe('GET /admin/pages', () => {
    it('trả cả trang đang ẩn, kèm ngôn ngữ đã có nội dung', async () => {
      const res = await request(server())
        .get(api())
        .set(bearer(token))
        .expect(200);
      const data = res.body.data as {
        key: string;
        title: string;
        languages: string[];
        isVisible: boolean;
      }[];
      expect(data.map((p) => p.key)).toEqual(['about', 'contact']);
      expect(data[0]).toMatchObject({
        title: 'Giới thiệu',
        languages: ['vi'],
        isVisible: true,
      });
      expect(data[1]).toMatchObject({
        title: 'contact',
        languages: [],
        isVisible: false,
      });
    });
  });

  describe('GET /admin/pages/:key', () => {
    it('mỗi ngôn ngữ đang hoạt động một tab, tab chưa có nội dung thì rỗng', async () => {
      const res = await request(server())
        .get(api('/about'))
        .set(bearer(token))
        .expect(200);
      expect(res.body.data.translations).toEqual([
        expect.objectContaining({
          code: 'vi',
          isDefault: true,
          title: 'Giới thiệu',
          content: '<p>Xin chào</p>',
        }),
        expect.objectContaining({ code: 'en', title: '', content: '' }),
      ]);
    });

    it('404 khi key không có', async () => {
      const res = await request(server())
        .get(api('/khong-co'))
        .set(bearer(token))
        .expect(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /admin/pages/:key', () => {
    it('lưu bản dịch, đổi trạng thái hiển thị và tăng updatedAt', async () => {
      const before = (await Page.findOne({ where: { key: 'about' } }))!;
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const res = await put('about', {
        isVisible: false,
        translations: [
          vi,
          { code: 'en', title: 'About us', content: '<p>Hello</p>' },
        ],
      }).expect(200);
      expect(res.body.data.isVisible).toBe(false);
      const titles = (res.body.data.translations as { title: string }[]).map(
        (t) => t.title,
      );
      expect(titles).toEqual(['Giới thiệu mới', 'About us']);
      const after = (await Page.findOne({ where: { key: 'about' } }))!;
      expect(after.updatedAt.getTime()).toBeGreaterThan(
        before.updatedAt.getTime(),
      );
      expect(await PageTranslation.count({ where: { pageId: after.id } })).toBe(
        2,
      );
    });

    it('trang đã ẩn không hiện ở trang công khai, bật lại thì hiện', async () => {
      await put('about', { isVisible: false, translations: [vi] }).expect(200);
      await request(server()).get('/api/v1/pages/about').expect(404);
      await put('about', { isVisible: true, translations: [vi] }).expect(200);
      await request(server()).get('/api/v1/pages/about').expect(200);
    });

    it('lọc XSS khỏi nội dung trước khi lưu', async () => {
      const res = await put('about', {
        isVisible: true,
        translations: [
          {
            ...vi,
            content: '<p onclick="x()">Chào</p><script>alert(1)</script>',
          },
        ],
      }).expect(200);
      const content = res.body.data.translations[0].content as string;
      expect(content).not.toContain('<script');
      expect(content).not.toContain('onclick');
      expect(content).toContain('Chào');
    });

    it('ngôn ngữ khác để trống cả hai thì xóa bản dịch đã có', async () => {
      await put('about', {
        isVisible: true,
        translations: [
          vi,
          { code: 'en', title: 'About', content: '<p>Hi</p>' },
        ],
      }).expect(200);
      await put('about', {
        isVisible: true,
        translations: [vi, { code: 'en', title: '', content: '' }],
      }).expect(200);
      const page = (await Page.findOne({ where: { key: 'about' } }))!;
      expect(await PageTranslation.count({ where: { pageId: page.id } })).toBe(
        1,
      );
    });

    it('400 khi thiếu ngôn ngữ mặc định hoặc chỉ điền một nửa ngôn ngữ khác, không ghi gì', async () => {
      let res = await put('about', {
        isVisible: false,
        translations: [{ code: 'en', title: 'About', content: '<p>Hi</p>' }],
      }).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(fieldsOf(res.body)).toEqual([
        'translations.vi.content',
        'translations.vi.title',
      ]);

      res = await put('about', {
        isVisible: false,
        translations: [vi, { code: 'en', title: 'About', content: '' }],
      }).expect(400);
      expect(fieldsOf(res.body)).toEqual(['translations.en.content']);

      const page = (await Page.findOne({ where: { key: 'about' } }))!;
      expect(page.isVisible).toBe(true);
      expect(await PageTranslation.count({ where: { pageId: page.id } })).toBe(
        1,
      );
    });

    it('400 khi mã ngôn ngữ không tồn tại hoặc gửi trùng', async () => {
      let res = await put('about', {
        isVisible: true,
        translations: [
          vi,
          { code: 'fr', title: 'À propos', content: '<p>Salut</p>' },
        ],
      }).expect(400);
      expect(fieldsOf(res.body)).toEqual(['translations.fr']);

      res = await put('about', {
        isVisible: true,
        translations: [vi, { ...vi }],
      }).expect(400);
      expect(fieldsOf(res.body)).toEqual(['translations.vi']);
    });

    it('400 khi body sai kiểu (thiếu isVisible, translations không phải mảng)', async () => {
      await put('about', { translations: [vi] }).expect(400);
      await put('about', { isVisible: true, translations: 'x' }).expect(400);
    });

    it('404 khi key không có', async () => {
      const res = await put('khong-co', {
        isVisible: true,
        translations: [vi],
      }).expect(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
