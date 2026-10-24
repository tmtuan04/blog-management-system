import request from 'supertest';
import { Language } from '../src/modules/languages/models/language.model';
import { TestContext, createTestApp } from './helpers/app';
import { flushRedis, resetDatabase } from './helpers/db';

describe('Languages (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(() => resetDatabase(ctx.app));

  afterAll(() => ctx.app.close());

  describe('GET /api/v1/languages', () => {
    it('trả ngôn ngữ đang hoạt động, mặc định đứng đầu, không cần đăng nhập', async () => {
      const res = await request(server()).get('/api/v1/languages').expect(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Lấy danh sách ngôn ngữ thành công',
        data: [
          { code: 'vi', name: 'Tiếng Việt', isDefault: true },
          { code: 'en', name: 'English', isDefault: false },
        ],
      });
    });

    it('không trả ngôn ngữ đã tắt', async () => {
      await Language.update({ isActive: false }, { where: { code: 'en' } });
      await flushRedis(ctx.app);
      const res = await request(server()).get('/api/v1/languages').expect(200);
      expect(res.body.data).toEqual([
        { code: 'vi', name: 'Tiếng Việt', isDefault: true },
      ]);
    });

    it('lưu cache cache:languages:active', async () => {
      await request(server()).get('/api/v1/languages').expect(200);
      // Sửa DB mà không xóa cache thì vẫn trả dữ liệu cũ
      await Language.update({ name: 'Tiếng Anh' }, { where: { code: 'en' } });
      const res = await request(server()).get('/api/v1/languages').expect(200);
      expect(res.body.data[1].name).toBe('English');
    });
  });
});
