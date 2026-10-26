import request from 'supertest';
import { RedisService } from '../src/infra/redis/redis.service';
import { User } from '../src/modules/users/models/user.model';
import { TestContext, createTestApp } from './helpers/app';
import { TEST_PASSWORD, bearer, createUser, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

describe('Auth (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const api = (path: string) => `/api/v1/auth${path}`;

  const login = (email: string, password = TEST_PASSWORD) =>
    request(server()).post(api('/login')).send({ email, password });

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    jest.clearAllMocks();
  });

  afterAll(() => ctx.app.close());

  describe('POST /auth/register (UC01)', () => {
    const body = {
      fullName: '  Hoàng Văn Long  ',
      email: 'Long@Test.Local',
      password: 'matkhau123',
      confirmPassword: 'matkhau123',
    };

    it('201, role user, email chữ thường, không trả password_hash', async () => {
      const res = await request(server())
        .post(api('/register'))
        .send(body)
        .expect(201);
      expect(res.body).toEqual({
        success: true,
        message: 'Đăng ký thành công. Đăng nhập để bắt đầu.',
        data: {
          id: expect.any(Number),
          fullName: 'Hoàng Văn Long',
          email: 'long@test.local',
          avatar: null,
          role: 'user',
        },
      });
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
      const user = await User.scope('withPassword').findOne({
        where: { email: 'long@test.local' },
      });
      expect(user!.passwordHash).toMatch(/^\$2b\$10\$/);
      expect(user!.isActive).toBe(true);
    });

    it('409 kèm errors[{ field: email }] khi email đã tồn tại', async () => {
      await createUser('user', { email: 'long@test.local' });
      const res = await request(server())
        .post(api('/register'))
        .send(body)
        .expect(409);
      expect(res.body).toMatchObject({
        success: false,
        code: 'CONFLICT',
        errors: [{ field: 'email', message: 'Email này đã được đăng ký.' }],
      });
    });

    it('400 với lỗi từng field', async () => {
      const res = await request(server())
        .post(api('/register'))
        .send({
          fullName: 'A',
          email: 'sai',
          password: 'matkhau',
          confirmPassword: 'x',
        })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'fullName', message: 'Họ tên từ 2 đến 150 ký tự.' },
          { field: 'email', message: 'Email không hợp lệ.' },
          {
            field: 'password',
            message: 'Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.',
          },
          {
            field: 'confirmPassword',
            message: 'Mật khẩu xác nhận không khớp.',
          },
        ]),
      );
    });

    it('400 khi gửi role (không cho tự chọn role)', async () => {
      const res = await request(server())
        .post(api('/register'))
        .send({ ...body, role: 'super_admin' })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'role', message: 'Trường này không được phép' },
      ]);
    });
  });

  describe('POST /auth/login (UC02)', () => {
    it('200, trả accessToken, refreshToken, user', async () => {
      const owner = await createUser('blog_owner', {
        email: 'owner@test.local',
      });
      const res = await login('OWNER@test.local').expect(200);
      expect(res.body.data).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: owner.id,
          fullName: owner.fullName,
          email: 'owner@test.local',
          avatar: null,
          role: 'blog_owner',
        },
      });
    });

    it('401 INVALID_CREDENTIALS cùng một thông báo cho sai mật khẩu và sai email', async () => {
      await createUser('user', { email: 'u@test.local' });
      const wrongPassword = await login('u@test.local', 'Sai123456').expect(
        401,
      );
      const wrongEmail = await login('khong-co@test.local').expect(401);
      for (const res of [wrongPassword, wrongEmail]) {
        expect(res.body).toEqual({
          success: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Email hoặc mật khẩu không đúng.',
        });
      }
    });

    it('403 ACCOUNT_LOCKED khi tài khoản bị khóa', async () => {
      await createUser('user', { email: 'locked@test.local', isActive: false });
      const res = await login('locked@test.local').expect(403);
      expect(res.body.code).toBe('ACCOUNT_LOCKED');
    });

    it('sai lần thứ 6 trong 15 phút nhận 429, kể cả khi mật khẩu đúng', async () => {
      await createUser('user', { email: 'u@test.local' });
      for (let i = 0; i < 5; i++) {
        await login('u@test.local', 'Sai123456').expect(401);
      }
      const res = await login('u@test.local').expect(429);
      expect(res.body.code).toBe('TOO_MANY_REQUESTS');
      // Bộ đếm tính theo IP + email: email khác vẫn đăng nhập được
      await createUser('user', { email: 'v@test.local' });
      await login('v@test.local').expect(200);
    });

    it('đăng nhập đúng thì xóa bộ đếm lần sai', async () => {
      await createUser('user', { email: 'u@test.local' });
      for (let i = 0; i < 4; i++) {
        await login('u@test.local', 'Sai123456').expect(401);
      }
      await login('u@test.local').expect(200);
      for (let i = 0; i < 4; i++) {
        await login('u@test.local', 'Sai123456').expect(401);
      }
      await login('u@test.local').expect(200);
    });

    it('400 khi thiếu field', async () => {
      const res = await request(server())
        .post(api('/login'))
        .send({})
        .expect(400);
      const errors = res.body.errors as { field: string }[];
      expect(errors.map((e) => e.field)).toEqual(['email', 'password']);
    });
  });

  describe('POST /auth/refresh (UC02)', () => {
    it('xoay vòng: cấp cặp mới, refresh token cũ không dùng lại được', async () => {
      await createUser('user', { email: 'u@test.local' });
      const { refreshToken } = (await login('u@test.local')).body.data;

      const res = await request(server())
        .post(api('/refresh'))
        .send({ refreshToken })
        .expect(200);
      expect(res.body.data).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(res.body.data.refreshToken).not.toBe(refreshToken);

      const reused = await request(server())
        .post(api('/refresh'))
        .send({ refreshToken })
        .expect(401);
      expect(reused.body.code).toBe('TOKEN_EXPIRED');

      // Access token mới dùng được
      await request(server())
        .get(api('/me'))
        .set(bearer(res.body.data.accessToken))
        .expect(200);
    });

    it('401 TOKEN_EXPIRED khi token rác', async () => {
      const res = await request(server())
        .post(api('/refresh'))
        .send({ refreshToken: 'abc' })
        .expect(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('POST /auth/logout (UC04)', () => {
    it('thu hồi refresh token hiện tại', async () => {
      await createUser('user', { email: 'u@test.local' });
      const { accessToken, refreshToken } = (await login('u@test.local')).body
        .data;

      const res = await request(server())
        .post(api('/logout'))
        .set(bearer(accessToken))
        .send({ refreshToken })
        .expect(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Đăng xuất thành công',
        data: null,
      });

      await request(server())
        .post(api('/refresh'))
        .send({ refreshToken })
        .expect(401);
    });

    it('401 khi không có access token', async () => {
      await request(server())
        .post(api('/logout'))
        .send({ refreshToken: 'x' })
        .expect(401);
    });
  });

  describe('Quên / đặt lại mật khẩu (UC03)', () => {
    const forgot = (email: string) =>
      request(server()).post(api('/forgot-password')).send({ email });

    const resetTokenFromMail = (): string => {
      const link = ctx.mail.sendPasswordReset.mock.calls[0][2] as string;
      expect(link).toMatch(
        /^http:\/\/localhost:4200\/reset-password\?token=[0-9a-f]{64}$/,
      );
      return new URL(link).searchParams.get('token')!;
    };

    it('luôn trả cùng một message; chỉ gửi email khi email có thật', async () => {
      await createUser('user', {
        email: 'u@test.local',
        fullName: 'Người dùng',
      });

      const exists = await forgot('u@test.local').expect(200);
      const notExists = await forgot('khong-co@test.local').expect(200);
      expect(exists.body).toEqual(notExists.body);
      expect(exists.body.message).toBe(
        'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu',
      );
      expect(ctx.mail.sendPasswordReset).toHaveBeenCalledTimes(1);
      expect(ctx.mail.sendPasswordReset).toHaveBeenCalledWith(
        'u@test.local',
        'Người dùng',
        expect.stringContaining('/reset-password?token='),
      );
    });

    it('đặt lại thành công: đăng nhập bằng mật khẩu mới, mọi refresh token cũ bị thu hồi', async () => {
      await createUser('user', { email: 'u@test.local' });
      const { refreshToken } = (await login('u@test.local')).body.data;
      await forgot('u@test.local').expect(200);
      const token = resetTokenFromMail();

      await request(server())
        .post(api('/reset-password'))
        .send({
          token,
          password: 'MatKhauMoi1',
          confirmPassword: 'MatKhauMoi1',
        })
        .expect(200);

      await login('u@test.local').expect(401);
      await login('u@test.local', 'MatKhauMoi1').expect(200);
      await request(server())
        .post(api('/refresh'))
        .send({ refreshToken })
        .expect(401);
    });

    it('token chỉ dùng được một lần', async () => {
      await createUser('user', { email: 'u@test.local' });
      await forgot('u@test.local').expect(200);
      const token = resetTokenFromMail();
      const body = {
        token,
        password: 'MatKhauMoi1',
        confirmPassword: 'MatKhauMoi1',
      };

      await request(server())
        .post(api('/reset-password'))
        .send(body)
        .expect(200);
      const res = await request(server())
        .post(api('/reset-password'))
        .send(body)
        .expect(400);
      expect(res.body.code).toBe('RESET_TOKEN_INVALID');
    });

    it('token hết hạn sau 15 phút', async () => {
      await createUser('user', { email: 'u@test.local' });
      await forgot('u@test.local').expect(200);
      const token = resetTokenFromMail();
      const ttl = await ctx.app
        .get(RedisService)
        .client.ttl(`auth:reset:${token}`);
      expect(ttl).toBeGreaterThan(890);
      expect(ttl).toBeLessThanOrEqual(900);
    });

    it('mật khẩu mới phải theo ràng buộc UC01', async () => {
      const res = await request(server())
        .post(api('/reset-password'))
        .send({ token: 'x', password: 'abc', confirmPassword: 'abc' })
        .expect(400);
      expect(res.body.errors[0].field).toBe('password');
    });

    it('quá 3 lần / 15 phút / IP thì 429', async () => {
      for (let i = 0; i < 3; i++) {
        await forgot(`x${i}@test.local`).expect(200);
      }
      const res = await forgot('x4@test.local').expect(429);
      expect(res.body.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('GET /auth/me', () => {
    it('trả user + role', async () => {
      const { user, token } = await tokenFor(ctx.app, 'super_admin');
      const res = await request(server())
        .get(api('/me'))
        .set(bearer(token))
        .expect(200);
      expect(res.body.data).toMatchObject({ id: user.id, role: 'super_admin' });
    });

    it('401 khi không có token', async () => {
      const res = await request(server()).get(api('/me')).expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('tài khoản vừa bị khóa: access token cũ bị chặn khi cache is_active hết hạn', async () => {
      const { user, token } = await tokenFor(ctx.app, 'user');
      await request(server()).get(api('/me')).set(bearer(token)).expect(200);
      await User.update({ isActive: false }, { where: { id: user.id } });
      // Mô phỏng UC14 khóa tài khoản: xóa auth:user-active ngay
      await ctx.app.get(RedisService).client.del(`auth:user-active:${user.id}`);
      const res = await request(server())
        .get(api('/me'))
        .set(bearer(token))
        .expect(403);
      expect(res.body.code).toBe('ACCOUNT_LOCKED');
    });
  });
});
