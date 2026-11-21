import { existsSync } from 'fs';
import request from 'supertest';
import { RedisKeys } from '../src/common/utils/redis-keys';
import { RedisService } from '../src/infra/redis/redis.service';
import { UploadService } from '../src/infra/upload/upload.service';
import { Role } from '../src/modules/users/models/role.model';
import { User } from '../src/modules/users/models/user.model';
import { TestContext, createTestApp } from './helpers/app';
import { TEST_PASSWORD, bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';
import { PNG_1PX } from './helpers/fixtures';

describe('Profile UC12 (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const url = '/api/v1/profile';

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(() => resetDatabase(ctx.app));

  afterAll(() => ctx.app.close());

  const onDisk = (path: string) =>
    existsSync(ctx.app.get(UploadService).toDiskPath(path)!);

  /** Đặt một key cache bài viết giả để kiểm tra có bị xóa không */
  const seedPostsCache = async () => {
    const key = RedisKeys.postsList('vi', 1, 10);
    await ctx.app.get(RedisService).client.set(key, '{}');
    return key;
  };
  const cacheExists = async (key: string) =>
    (await ctx.app.get(RedisService).client.exists(key)) === 1;

  const login = (email: string, password = TEST_PASSWORD) =>
    request(server()).post('/api/v1/auth/login').send({ email, password });

  describe('Quyền', () => {
    it('401 khi không có token', async () => {
      const res = await request(server()).get(url).expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('403 ACCOUNT_LOCKED khi tài khoản đã bị khóa', async () => {
      const { token } = await tokenFor(ctx.app, 'user', { isActive: false });
      const res = await request(server())
        .get(url)
        .set(bearer(token))
        .expect(403);
      expect(res.body.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('GET /profile', () => {
    it('trả hồ sơ, không có passwordHash', async () => {
      const { user, token } = await tokenFor(ctx.app, 'blog_owner', {
        fullName: 'Nguyễn Văn An',
      });
      const res = await request(server())
        .get(url)
        .set(bearer(token))
        .expect(200);
      expect(res.body.data).toEqual({
        fullName: 'Nguyễn Văn An',
        email: user.email,
        avatar: null,
        role: 'blog_owner',
        hasPassword: true,
      });
    });

    it('tài khoản OAuth chưa có mật khẩu: hasPassword = false', async () => {
      const { user, token } = await tokenFor(ctx.app, 'user');
      await User.update({ passwordHash: null }, { where: { id: user.id } });
      const res = await request(server())
        .get(url)
        .set(bearer(token))
        .expect(200);
      expect(res.body.data.hasPassword).toBe(false);
    });
  });

  describe('PATCH /profile', () => {
    it('đổi họ tên (bỏ khoảng trắng hai đầu) và xóa cache bài viết', async () => {
      const { user, token } = await tokenFor(ctx.app, 'user');
      const key = await seedPostsCache();
      const res = await request(server())
        .patch(url)
        .set(bearer(token))
        .send({ fullName: '  Trần Thị Bình  ' })
        .expect(200);
      expect(res.body.data.fullName).toBe('Trần Thị Bình');
      await user.reload();
      expect(user.fullName).toBe('Trần Thị Bình');
      expect(await cacheExists(key)).toBe(false);
    });

    it('400 khi họ tên ngắn hơn 2 ký tự', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .patch(url)
        .set(bearer(token))
        .send({ fullName: ' A ' })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'fullName', message: 'Họ tên từ 2 đến 150 ký tự.' },
      ]);
    });

    it('400 khi họ tên dài hơn 150 ký tự', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .patch(url)
        .set(bearer(token))
        .send({ fullName: 'a'.repeat(151) })
        .expect(400);
      expect(res.body.errors[0].field).toBe('fullName');
    });

    it('400 khi gửi kèm email, role; email và role không đổi', async () => {
      const { user, token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .patch(url)
        .set(bearer(token))
        .send({
          fullName: 'Trần Thị Bình',
          email: 'hacker@test.local',
          role: 'super_admin',
        })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(
        (res.body.errors as { field: string }[]).map((e) => e.field).sort(),
      ).toEqual(['email', 'role']);

      await user.reload({ include: [Role] });
      expect(user.email).not.toBe('hacker@test.local');
      expect(user.role!.code).toBe('user');
      expect(user.fullName).not.toBe('Trần Thị Bình');
    });
  });

  describe('POST /profile/avatar', () => {
    const avatarUrl = `${url}/avatar`;

    it('lưu vào uploads/avatars, cập nhật hồ sơ, xóa ảnh cũ và cache bài viết', async () => {
      const { token } = await tokenFor(ctx.app, 'user');

      const first = await request(server())
        .post(avatarUrl)
        .set(bearer(token))
        .attach('file', PNG_1PX, 'avatar.png')
        .expect(200);
      const oldPath = first.body.data.path as string;
      expect(oldPath).toMatch(/^uploads\/avatars\/[0-9a-f-]{36}\.png$/);
      expect(first.body.data.url).toContain(oldPath);
      expect(onDisk(oldPath)).toBe(true);

      const key = await seedPostsCache();
      const second = await request(server())
        .post(avatarUrl)
        .set(bearer(token))
        .attach('file', PNG_1PX, 'avatar-2.png')
        .expect(200);
      const newPath = second.body.data.path as string;

      expect(onDisk(newPath)).toBe(true);
      expect(onDisk(oldPath)).toBe(false);
      expect(await cacheExists(key)).toBe(false);

      const profile = await request(server())
        .get(url)
        .set(bearer(token))
        .expect(200);
      expect(profile.body.data.avatar).toBe(newPath);

      await request(server()).get(`/${newPath}`).expect(200);
    });

    it('400 khi file .php đổi tên thành .jpg, avatar giữ nguyên', async () => {
      const { user, token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .post(avatarUrl)
        .set(bearer(token))
        .attach('file', Buffer.from('<?php echo 1; ?>'), 'shell.jpg')
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'file', message: 'File không phải ảnh hợp lệ.' },
      ]);
      await user.reload();
      expect(user.avatar).toBeNull();
    });

    it('400 khi file lớn hơn 2MB', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      const big = Buffer.concat([PNG_1PX, Buffer.alloc(2 * 1024 * 1024)]);
      const res = await request(server())
        .post(avatarUrl)
        .set(bearer(token))
        .attach('file', big, 'big.png')
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'file', message: 'Ảnh tối đa 2MB.' },
      ]);
    });

    it('400 khi không gửi file', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .post(avatarUrl)
        .set(bearer(token))
        .expect(400);
      expect(res.body.errors[0].field).toBe('file');
    });
  });

  describe('PATCH /profile/password', () => {
    const passwordUrl = `${url}/password`;
    const body = { newPassword: 'NewPass123', confirmPassword: 'NewPass123' };

    it('đổi được, đăng nhập bằng mật khẩu mới, refresh token cũ bị thu hồi', async () => {
      const { user, token } = await tokenFor(ctx.app, 'user');
      const session = await login(user.email).expect(200);

      await request(server())
        .patch(passwordUrl)
        .set(bearer(token))
        .send({ ...body, currentPassword: TEST_PASSWORD })
        .expect(200);

      await request(server())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.body.data.refreshToken })
        .expect(401);
      await login(user.email).expect(401);
      await login(user.email, 'NewPass123').expect(200);
    });

    it('400 errors[{ field: currentPassword }] khi sai mật khẩu hiện tại', async () => {
      const { user, token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .patch(passwordUrl)
        .set(bearer(token))
        .send({ ...body, currentPassword: 'Sai123456' })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng.' },
      ]);
      await login(user.email).expect(200);
    });

    it('400 khi đã có mật khẩu mà không gửi currentPassword', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .patch(passwordUrl)
        .set(bearer(token))
        .send(body)
        .expect(400);
      expect(res.body.errors[0].field).toBe('currentPassword');
    });

    it('400 khi mật khẩu mới không có số và xác nhận không khớp', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .patch(passwordUrl)
        .set(bearer(token))
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: 'chikochu',
          confirmPassword: 'khac-nhau',
        })
        .expect(400);
      expect(
        (res.body.errors as { field: string }[]).map((e) => e.field).sort(),
      ).toEqual(['confirmPassword', 'newPassword']);
    });

    it('tài khoản OAuth chưa có mật khẩu: đặt mật khẩu không cần currentPassword', async () => {
      const { user, token } = await tokenFor(ctx.app, 'user');
      await User.update({ passwordHash: null }, { where: { id: user.id } });

      await request(server())
        .patch(passwordUrl)
        .set(bearer(token))
        .send(body)
        .expect(200);

      const profile = await request(server())
        .get(url)
        .set(bearer(token))
        .expect(200);
      expect(profile.body.data.hasPassword).toBe(true);
      await login(user.email, 'NewPass123').expect(200);
    });
  });
});
