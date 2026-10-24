import request from 'supertest';
import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';
import { PNG_1PX } from './helpers/fixtures';

describe('Uploads (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const url = '/api/v1/uploads/images';

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(() => resetDatabase(ctx.app));

  afterAll(() => ctx.app.close());

  it('401 khi không có token', async () => {
    const res = await request(server()).post(url).expect(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('401 UNAUTHORIZED khi token sai', async () => {
    const res = await request(server())
      .post(url)
      .set(bearer('abc.def.ghi'))
      .expect(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('403 khi role user', async () => {
    const { token } = await tokenFor(ctx.app, 'user');
    const res = await request(server())
      .post(url)
      .set(bearer(token))
      .expect(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('403 ACCOUNT_LOCKED khi tài khoản đã bị khóa', async () => {
    const { token } = await tokenFor(ctx.app, 'blog_owner', {
      isActive: false,
    });
    const res = await request(server())
      .post(url)
      .set(bearer(token))
      .expect(403);
    expect(res.body.code).toBe('ACCOUNT_LOCKED');
  });

  it('201 với Blog Owner, trả path và url; ảnh xem được tại /uploads', async () => {
    const { token } = await tokenFor(ctx.app, 'blog_owner');
    const res = await request(server())
      .post(url)
      .set(bearer(token))
      .attach('file', PNG_1PX, 'anh.png')
      .expect(201);
    expect(res.body.data.path).toMatch(/^uploads\/images\/[0-9a-f-]{36}\.png$/);
    expect(res.body.data.url).toContain(res.body.data.path);

    await request(server())
      .get(`/${res.body.data.path}`)
      .expect(200)
      .expect('Content-Type', /image\/png/);
  });

  it('Super Admin cũng upload được (kế thừa Blog Owner)', async () => {
    const { token } = await tokenFor(ctx.app, 'super_admin');
    await request(server())
      .post(url)
      .set(bearer(token))
      .attach('file', PNG_1PX, 'anh.png')
      .expect(201);
  });

  it('400 khi file .php đổi tên thành .jpg', async () => {
    const { token } = await tokenFor(ctx.app, 'blog_owner');
    const res = await request(server())
      .post(url)
      .set(bearer(token))
      .attach('file', Buffer.from('<?php system($_GET["c"]); ?>'), 'shell.jpg')
      .expect(400);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'file' }],
    });
  });

  it('400 khi file lớn hơn 2MB', async () => {
    const { token } = await tokenFor(ctx.app, 'blog_owner');
    const big = Buffer.concat([PNG_1PX, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await request(server())
      .post(url)
      .set(bearer(token))
      .attach('file', big, 'big.png')
      .expect(400);
    expect(res.body.errors).toEqual([
      { field: 'file', message: 'Ảnh tối đa 2MB.' },
    ]);
  });

  it('400 khi không gửi file', async () => {
    const { token } = await tokenFor(ctx.app, 'blog_owner');
    const res = await request(server())
      .post(url)
      .set(bearer(token))
      .expect(400);
    expect(res.body.errors[0]).toEqual({
      field: 'file',
      message: 'Vui lòng chọn ảnh.',
    });
  });
});
