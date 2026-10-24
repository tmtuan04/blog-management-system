import request from 'supertest';
import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

/**
 * Kiểm tra format requirements 6.4 (thêm `code` cho lỗi). Mỗi module thêm vào đây
 * một API thành công, một API phân trang (nếu có) và một API lỗi.
 */
describe('Response format 6.4 (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.app);
  });

  afterAll(() => ctx.app.close());

  const expectSuccess = (body: Record<string, unknown>) => {
    expect(body.success).toBe(true);
    expect(typeof body.message).toBe('string');
    expect(body).toHaveProperty('data');
  };

  const expectError = (body: Record<string, unknown>) => {
    expect(body.success).toBe(false);
    expect(typeof body.code).toBe('string');
    expect(typeof body.message).toBe('string');
    expect(body).not.toHaveProperty('data');
    expect(body).not.toHaveProperty('stack');
  };

  describe('Phần nền', () => {
    it('route không tồn tại: 404 NOT_FOUND', async () => {
      const res = await request(server())
        .get('/api/v1/khong-ton-tai')
        .expect(404);
      expectError(res.body);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('JSON sai cú pháp: 400', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const res = await request(server())
        .post('/api/v1/uploads/images')
        .set(bearer(token))
        .set('Content-Type', 'application/json')
        .send('{"a":')
        .expect(400);
      expectError(res.body);
    });

    it('có header bảo mật của helmet', async () => {
      const res = await request(server()).get('/api/v1/languages');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers).not.toHaveProperty('x-powered-by');
    });
  });

  describe('Languages', () => {
    it('thành công', async () => {
      const res = await request(server()).get('/api/v1/languages').expect(200);
      expectSuccess(res.body);
      expect(res.body).not.toHaveProperty('meta');
    });
  });

  describe('Uploads', () => {
    it('lỗi validate có errors[] với field', async () => {
      const { token } = await tokenFor(ctx.app, 'blog_owner');
      const res = await request(server())
        .post('/api/v1/uploads/images')
        .set(bearer(token))
        .expect(400);
      expectError(res.body);
      expect(res.body.errors).toEqual([
        { field: 'file', message: expect.any(String) },
      ]);
    });
  });
});
