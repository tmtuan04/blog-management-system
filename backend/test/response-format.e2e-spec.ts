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

  describe('Admin Languages', () => {
    it('thành công', async () => {
      const { token } = await tokenFor(ctx.app, 'super_admin');
      const res = await request(server())
        .get('/api/v1/admin/languages')
        .set(bearer(token))
        .expect(200);
      expectSuccess(res.body);
      expect(res.body).not.toHaveProperty('meta');
    });

    it('lỗi nghiệp vụ có code riêng', async () => {
      const { token } = await tokenFor(ctx.app, 'super_admin');
      const res = await request(server())
        .post('/api/v1/admin/languages')
        .set(bearer(token))
        .send({ code: 'vi', name: 'Tiếng Việt' })
        .expect(409);
      expectError(res.body);
      expect(res.body.errors).toEqual([
        { field: 'code', message: expect.any(String) },
      ]);
    });
  });

  describe('UI Translations', () => {
    it('thành công', async () => {
      const res = await request(server())
        .get('/api/v1/ui-translations/vi')
        .expect(200);
      expectSuccess(res.body);
    });

    it('phân trang có meta', async () => {
      const { token } = await tokenFor(ctx.app, 'super_admin');
      const res = await request(server())
        .get('/api/v1/admin/ui-translations')
        .set(bearer(token))
        .expect(200);
      expectSuccess(res.body);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
    });

    it('lỗi validate', async () => {
      const { token } = await tokenFor(ctx.app, 'super_admin');
      const res = await request(server())
        .post('/api/v1/admin/ui-translations')
        .set(bearer(token))
        .send({})
        .expect(400);
      expectError(res.body);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Auth', () => {
    it('thành công', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .get('/api/v1/auth/me')
        .set(bearer(token))
        .expect(200);
      expectSuccess(res.body);
    });

    it('lỗi validate', async () => {
      const res = await request(server())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);
      expectError(res.body);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('401 khi không có token', async () => {
      const res = await request(server()).get('/api/v1/auth/me').expect(401);
      expectError(res.body);
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
