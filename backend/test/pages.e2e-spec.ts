import request from 'supertest';
import { PageTranslation } from '../src/modules/pages/models/page-translation.model';
import { Page } from '../src/modules/pages/models/page.model';
import { Language } from '../src/modules/languages/models/language.model';
import { TestContext, createTestApp } from './helpers/app';
import { resetDatabase } from './helpers/db';

describe('Pages UC11 (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const api = (path = '') => `/api/v1/pages${path}`;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    const vi = (await Language.findOne({ where: { code: 'vi' } }))!;
    const en = (await Language.findOne({ where: { code: 'en' } }))!;
    const about = await Page.create({ key: 'about', isVisible: true });
    const contact = await Page.create({ key: 'contact', isVisible: true });
    const privacy = await Page.create({ key: 'privacy', isVisible: false });
    await PageTranslation.bulkCreate([
      {
        pageId: about.id,
        languageId: vi.id,
        title: 'Giới thiệu',
        content: '<p>Xin chào</p>',
      },
      {
        pageId: about.id,
        languageId: en.id,
        title: 'About',
        content: '<p>Hello</p>',
      },
      {
        pageId: contact.id,
        languageId: vi.id,
        title: 'Liên hệ',
        content: '<p>Gọi cho chúng tôi</p>',
      },
      {
        pageId: privacy.id,
        languageId: vi.id,
        title: 'Bảo mật',
        content: '<p>Riêng tư</p>',
      },
    ]);
  });

  afterAll(() => ctx.app.close());

  describe('GET /pages', () => {
    it('không cần đăng nhập, chỉ trả trang đang hiển thị và không kèm nội dung', async () => {
      const res = await request(server()).get(api()).expect(200);
      expect(res.body.data).toEqual([
        { key: 'about', title: 'Giới thiệu' },
        { key: 'contact', title: 'Liên hệ' },
      ]);
    });

    it('theo Accept-Language, thiếu bản dịch thì dùng ngôn ngữ mặc định', async () => {
      const res = await request(server())
        .get(api())
        .set('Accept-Language', 'en')
        .expect(200);
      expect(res.body.data).toEqual([
        { key: 'about', title: 'About' },
        { key: 'contact', title: 'Liên hệ' },
      ]);
    });
  });

  describe('GET /pages/:key', () => {
    it('trả tiêu đề và nội dung theo ngôn ngữ', async () => {
      const vi = await request(server()).get(api('/about')).expect(200);
      expect(vi.body.data).toEqual({
        key: 'about',
        title: 'Giới thiệu',
        content: '<p>Xin chào</p>',
      });
      const en = await request(server())
        .get(api('/about'))
        .set('Accept-Language', 'en')
        .expect(200);
      expect(en.body.data.title).toBe('About');
    });

    it('ngôn ngữ chưa có nội dung thì dùng bản mặc định', async () => {
      const res = await request(server())
        .get(api('/contact'))
        .set('Accept-Language', 'en')
        .expect(200);
      expect(res.body.data.title).toBe('Liên hệ');
    });

    it('404 khi trang đang ẩn hoặc key không có', async () => {
      for (const key of ['privacy', 'khong-co']) {
        const res = await request(server())
          .get(api(`/${key}`))
          .expect(404);
        expect(res.body.code).toBe('NOT_FOUND');
      }
    });
  });
});
