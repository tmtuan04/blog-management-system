import { compare } from 'bcrypt';
import request from 'supertest';
import { Role } from '../src/modules/users/models/role.model';
import { User } from '../src/modules/users/models/user.model';
import { TestContext, createTestApp } from './helpers/app';
import { TEST_PASSWORD, bearer, createUser, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

describe('Admin Users UC14 (e2e)', () => {
  let ctx: TestContext;
  let token: string;
  let adminId: number;
  const server = () => ctx.app.getHttpServer();
  const api = (path = '') => `/api/v1/admin/users${path}`;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    const admin = await tokenFor(ctx.app, 'super_admin', {
      email: 'admin@test.local',
      fullName: 'Super Admin',
    });
    token = admin.token;
    adminId = admin.user.id;
  });

  afterAll(() => ctx.app.close());

  const login = (email: string, password = TEST_PASSWORD) =>
    request(server()).post('/api/v1/auth/login').send({ email, password });

  const roleCodeOf = async (id: number) =>
    (await User.findByPk(id, { include: [Role] }))!.role!.code;

  const fieldsOf = (body: { errors?: { field: string }[] }) =>
    (body.errors ?? []).map((e) => e.field).sort();

  describe('quyền truy cập', () => {
    it('401 khi không có token', async () => {
      const res = await request(server()).get(api()).expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('403 khi là Blog Owner hoặc User, ở cả 4 route', async () => {
      const target = await createUser('user');
      for (const role of ['blog_owner', 'user'] as const) {
        const caller = await tokenFor(ctx.app, role);
        for (const call of [
          () => request(server()).get(api()),
          () =>
            request(server()).post(api()).send({
              fullName: 'Trần Thị Bình',
              email: 'binh@test.local',
              password: 'Password123',
              role: 'user',
            }),
          () =>
            request(server())
              .patch(api(`/${target.id}/role`))
              .send({ role: 'blog_owner' }),
          () =>
            request(server())
              .patch(api(`/${target.id}/status`))
              .send({ isActive: false }),
        ]) {
          const res = await call().set(bearer(caller.token)).expect(403);
          expect(res.body.code).toBe('FORBIDDEN');
        }
      }
      // Không route nào đã ghi gì
      expect(await roleCodeOf(target.id)).toBe('user');
      expect((await User.findByPk(target.id))!.isActive).toBe(true);
    });

    it('403 ACCOUNT_LOCKED khi chính Super Admin gọi đã bị khóa', async () => {
      const locked = await tokenFor(ctx.app, 'super_admin', {
        isActive: false,
      });
      const res = await request(server())
        .get(api())
        .set(bearer(locked.token))
        .expect(403);
      expect(res.body.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('GET /admin/users', () => {
    it('trả danh sách phân trang, mới tạo xếp trước, isSelf đúng dòng, không lộ passwordHash', async () => {
      const owner = await createUser('blog_owner', {
        email: 'owner@test.local',
        fullName: 'Nguyễn Văn An',
      });
      const locked = await createUser('user', {
        email: 'locked@test.local',
        fullName: 'Lê Văn Cường',
        isActive: false,
      });

      const res = await request(server())
        .get(api())
        .set(bearer(token))
        .expect(200);

      expect(res.body.message).toBe('Lấy danh sách người dùng thành công');
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      });
      expect(res.body.data).toEqual([
        {
          id: locked.id,
          fullName: 'Lê Văn Cường',
          email: 'locked@test.local',
          avatar: null,
          role: 'user',
          isActive: false,
          isSelf: false,
          createdAt: expect.any(String),
        },
        {
          id: owner.id,
          fullName: 'Nguyễn Văn An',
          email: 'owner@test.local',
          avatar: null,
          role: 'blog_owner',
          isActive: true,
          isSelf: false,
          createdAt: expect.any(String),
        },
        {
          id: adminId,
          fullName: 'Super Admin',
          email: 'admin@test.local',
          avatar: null,
          role: 'super_admin',
          isActive: true,
          isSelf: true,
          createdAt: expect.any(String),
        },
      ]);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password/i);
    });

    it('phân trang theo page và limit', async () => {
      for (let i = 1; i <= 4; i++) {
        await createUser('user', { email: `u${i}@test.local` });
      }
      const res = await request(server())
        .get(api('?page=2&limit=2'))
        .set(bearer(token))
        .expect(200);
      expect(res.body.meta).toEqual({
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
      expect(res.body.data).toHaveLength(2);
    });

    it('q tìm theo họ tên hoặc email, không phân biệt hoa thường', async () => {
      await createUser('user', {
        email: 'binh@test.local',
        fullName: 'Trần Thị Bình',
      });
      await createUser('user', {
        email: 'cuong@example.com',
        fullName: 'Lê Văn Cường',
      });

      const byName = await request(server())
        .get(api('?q=th%E1%BB%8B%20b%C3%ACnh'))
        .set(bearer(token))
        .expect(200);
      expect(
        (byName.body.data as { email: string }[]).map((u) => u.email),
      ).toEqual(['binh@test.local']);

      const byEmail = await request(server())
        .get(api('?q=EXAMPLE.com'))
        .set(bearer(token))
        .expect(200);
      expect(
        (byEmail.body.data as { email: string }[]).map((u) => u.email),
      ).toEqual(['cuong@example.com']);
    });

    it('q chứa % hoặc _ được hiểu là chữ thường, không phải ký tự đại diện', async () => {
      await createUser('user', { fullName: 'Người Dùng A' });
      const res = await request(server())
        .get(api('?q=%25'))
        .set(bearer(token))
        .expect(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('lọc theo role, theo isActive, và kết hợp cả hai', async () => {
      await createUser('blog_owner', { email: 'o1@test.local' });
      await createUser('blog_owner', {
        email: 'o2@test.local',
        isActive: false,
      });
      await createUser('user', { email: 'u1@test.local', isActive: false });
      const emails = async (query: string) =>
        (
          (
            await request(server())
              .get(api(query))
              .set(bearer(token))
              .expect(200)
          ).body.data as { email: string }[]
        )
          .map((u) => u.email)
          .sort();

      expect(await emails('?role=blog_owner')).toEqual([
        'o1@test.local',
        'o2@test.local',
      ]);
      expect(await emails('?isActive=false')).toEqual([
        'o2@test.local',
        'u1@test.local',
      ]);
      expect(await emails('?isActive=true&role=blog_owner')).toEqual([
        'o1@test.local',
      ]);
      expect(await emails('?role=super_admin&isActive=true')).toEqual([
        'admin@test.local',
      ]);
      // Tham số rỗng coi như không lọc
      expect(await emails('?q=&role=&isActive=')).toHaveLength(4);
    });

    it('400 khi role, isActive hoặc limit không hợp lệ', async () => {
      const res = await request(server())
        .get(api('?role=root&isActive=maybe&limit=51'))
        .set(bearer(token))
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(fieldsOf(res.body)).toEqual(['isActive', 'limit', 'role']);
    });
  });

  describe('POST /admin/users', () => {
    it('201: tạo tài khoản với role đã chọn, mật khẩu băm, đăng nhập được ngay', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          fullName: '  Trần Thị Bình  ',
          email: '  BINH@Test.local ',
          password: 'MatKhau123',
          role: 'blog_owner',
        })
        .expect(201);

      expect(res.body.message).toBe('Tạo tài khoản thành công');
      expect(res.body.data).toEqual({
        id: expect.any(Number),
        fullName: 'Trần Thị Bình',
        email: 'binh@test.local',
        avatar: null,
        role: 'blog_owner',
        isActive: true,
        isSelf: false,
        createdAt: expect.any(String),
      });
      const saved = await User.scope('withPassword').findByPk(
        res.body.data.id as number,
      );
      expect(saved!.passwordHash).not.toBe('MatKhau123');
      await expect(compare('MatKhau123', saved!.passwordHash!)).resolves.toBe(
        true,
      );
      const session = await login('binh@test.local', 'MatKhau123').expect(200);
      expect(session.body.data.user.role).toBe('blog_owner');
    });

    it('409 khi email đã có (kể cả khác hoa thường), lỗi ở field email', async () => {
      await createUser('user', { email: 'binh@test.local' });
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          fullName: 'Trần Thị Bình',
          email: 'BINH@test.local',
          password: 'MatKhau123',
          role: 'user',
        })
        .expect(409);
      expect(res.body.code).toBe('CONFLICT');
      expect(res.body.errors).toEqual([
        { field: 'email', message: 'Email này đã được đăng ký.' },
      ]);
      expect(await User.count()).toBe(2);
    });

    it('400 khi họ tên, email, mật khẩu, role không hợp lệ', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({
          fullName: 'A',
          email: 'khong-phai-email',
          password: '12345678',
          role: 'root',
        })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(fieldsOf(res.body)).toEqual([
        'email',
        'fullName',
        'password',
        'role',
      ]);
      expect(await User.count()).toBe(1);
    });

    it('400 khi thiếu field và khi gửi field không có trong DTO', async () => {
      const res = await request(server())
        .post(api())
        .set(bearer(token))
        .send({ fullName: 'Trần Thị Bình', isActive: false })
        .expect(400);
      expect(fieldsOf(res.body)).toEqual([
        'email',
        'isActive',
        'password',
        'role',
      ]);
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    it('200: đổi role, kết quả lưu trong DB', async () => {
      const user = await createUser('user');
      const res = await request(server())
        .patch(api(`/${user.id}/role`))
        .set(bearer(token))
        .send({ role: 'blog_owner' })
        .expect(200);
      expect(res.body.message).toBe('Đã đổi vai trò');
      expect(res.body.data).toMatchObject({
        id: user.id,
        role: 'blog_owner',
        isSelf: false,
      });
      expect(await roleCodeOf(user.id)).toBe('blog_owner');
    });

    it('nâng lên Super Admin rồi hạ về User khi vẫn còn Super Admin khác', async () => {
      const user = await createUser('user');
      await request(server())
        .patch(api(`/${user.id}/role`))
        .set(bearer(token))
        .send({ role: 'super_admin' })
        .expect(200);
      expect(await roleCodeOf(user.id)).toBe('super_admin');
      await request(server())
        .patch(api(`/${user.id}/role`))
        .set(bearer(token))
        .send({ role: 'user' })
        .expect(200);
      expect(await roleCodeOf(user.id)).toBe('user');
    });

    it('gửi lại đúng role hiện tại thì 200 và không đổi gì', async () => {
      const owner = await createUser('blog_owner');
      await request(server())
        .patch(api(`/${owner.id}/role`))
        .set(bearer(token))
        .send({ role: 'blog_owner' })
        .expect(200);
      expect(await roleCodeOf(owner.id)).toBe('blog_owner');
    });

    it('400 khi tự hạ quyền chính mình, role không đổi', async () => {
      const res = await request(server())
        .patch(api(`/${adminId}/role`))
        .set(bearer(token))
        .send({ role: 'user' })
        .expect(400);
      expect(res.body.code).toBe('BAD_REQUEST');
      expect(res.body.message).toBe('Không thể tự hạ quyền chính mình');
      expect(await roleCodeOf(adminId)).toBe('super_admin');
    });

    it('400 khi role không hợp lệ, :id không phải số; 404 khi không có người dùng', async () => {
      const user = await createUser('user');
      const invalid = await request(server())
        .patch(api(`/${user.id}/role`))
        .set(bearer(token))
        .send({ role: 'root' })
        .expect(400);
      expect(invalid.body.errors).toEqual([
        { field: 'role', message: 'Vai trò không hợp lệ.' },
      ]);
      await request(server())
        .patch(api('/abc/role'))
        .set(bearer(token))
        .send({ role: 'user' })
        .expect(400);
      const missing = await request(server())
        .patch(api('/999999/role'))
        .set(bearer(token))
        .send({ role: 'user' })
        .expect(404);
      expect(missing.body.code).toBe('NOT_FOUND');
    });

    it('hai Super Admin hạ quyền nhau cùng lúc: một bên thành công, bên kia 409 LAST_SUPER_ADMIN', async () => {
      // Tuần tự thì không bao giờ gặp 409 vì người gọi luôn là một Super Admin còn lại.
      // Chỉ đua nhau mới có thể làm hệ thống hết Super Admin, nên đây là ca cần khóa dòng
      const other = await tokenFor(ctx.app, 'super_admin');
      const [a, b] = await Promise.all([
        request(server())
          .patch(api(`/${other.user.id}/role`))
          .set(bearer(token))
          .send({ role: 'user' }),
        request(server())
          .patch(api(`/${adminId}/role`))
          .set(bearer(other.token))
          .send({ role: 'user' }),
      ]);

      expect([a.status, b.status].sort()).toEqual([200, 409]);
      const failed = a.status === 409 ? a : b;
      expect(failed.body.code).toBe('LAST_SUPER_ADMIN');
      const remaining = await User.count({
        where: { isActive: true },
        include: [{ model: Role, where: { code: 'super_admin' } }],
      });
      expect(remaining).toBe(1);
    });
  });

  describe('PATCH /admin/users/:id/status', () => {
    it('khóa: access token cũ bị từ chối ngay, refresh token bị thu hồi, không đăng nhập lại được', async () => {
      const target = await tokenFor(ctx.app, 'user', {
        email: 'target@test.local',
      });
      const { refreshToken } = (await login('target@test.local').expect(200))
        .body.data;
      // Gọi một lần để cache is_active = hoạt động, chứng minh route khóa có xóa cache
      await request(server())
        .get('/api/v1/profile')
        .set(bearer(target.token))
        .expect(200);

      const res = await request(server())
        .patch(api(`/${target.user.id}/status`))
        .set(bearer(token))
        .send({ isActive: false })
        .expect(200);

      expect(res.body.message).toBe('Đã cập nhật trạng thái tài khoản');
      expect(res.body.data).toMatchObject({
        id: target.user.id,
        isActive: false,
      });
      expect((await User.findByPk(target.user.id))!.isActive).toBe(false);

      const old = await request(server())
        .get('/api/v1/profile')
        .set(bearer(target.token))
        .expect(403);
      expect(old.body.code).toBe('ACCOUNT_LOCKED');
      const refresh = await request(server())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
      expect(refresh.body.code).toBe('TOKEN_EXPIRED');
      const again = await login('target@test.local').expect(403);
      expect(again.body.code).toBe('ACCOUNT_LOCKED');
    });

    it('mở khóa: đăng nhập lại được và token cũ dùng được trở lại', async () => {
      const target = await tokenFor(ctx.app, 'user', {
        email: 'target@test.local',
        isActive: false,
      });
      await request(server())
        .get('/api/v1/profile')
        .set(bearer(target.token))
        .expect(403);

      const res = await request(server())
        .patch(api(`/${target.user.id}/status`))
        .set(bearer(token))
        .send({ isActive: true })
        .expect(200);
      expect(res.body.data.isActive).toBe(true);

      await login('target@test.local').expect(200);
      await request(server())
        .get('/api/v1/profile')
        .set(bearer(target.token))
        .expect(200);
    });

    it('khóa tài khoản đã khóa thì vẫn 200 (gọi lại được)', async () => {
      const target = await createUser('user', { isActive: false });
      const res = await request(server())
        .patch(api(`/${target.id}/status`))
        .set(bearer(token))
        .send({ isActive: false })
        .expect(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('400 khi tự khóa chính mình, vẫn hoạt động', async () => {
      const res = await request(server())
        .patch(api(`/${adminId}/status`))
        .set(bearer(token))
        .send({ isActive: false })
        .expect(400);
      expect(res.body.code).toBe('BAD_REQUEST');
      expect(res.body.message).toBe(
        'Không thể tự khóa tài khoản của chính mình',
      );
      expect((await User.findByPk(adminId))!.isActive).toBe(true);
    });

    it('khóa một Super Admin khác khi còn Super Admin hoạt động thì được', async () => {
      const other = await createUser('super_admin');
      await request(server())
        .patch(api(`/${other.id}/status`))
        .set(bearer(token))
        .send({ isActive: false })
        .expect(200);
      expect((await User.findByPk(other.id))!.isActive).toBe(false);
    });

    it('hai Super Admin khóa nhau cùng lúc: một bên thành công, bên kia 409 LAST_SUPER_ADMIN', async () => {
      const other = await tokenFor(ctx.app, 'super_admin');
      const [a, b] = await Promise.all([
        request(server())
          .patch(api(`/${other.user.id}/status`))
          .set(bearer(token))
          .send({ isActive: false }),
        request(server())
          .patch(api(`/${adminId}/status`))
          .set(bearer(other.token))
          .send({ isActive: false }),
      ]);

      expect([a.status, b.status].sort()).toEqual([200, 409]);
      const failed = a.status === 409 ? a : b;
      expect(failed.body.code).toBe('LAST_SUPER_ADMIN');
      expect(
        await User.count({
          where: { isActive: true },
          include: [{ model: Role, where: { code: 'super_admin' } }],
        }),
      ).toBe(1);
    });

    it('400 khi isActive không phải boolean, 404 khi không có người dùng', async () => {
      const user = await createUser('user');
      const invalid = await request(server())
        .patch(api(`/${user.id}/status`))
        .set(bearer(token))
        .send({ isActive: 'khoa' })
        .expect(400);
      expect(invalid.body.errors).toEqual([
        { field: 'isActive', message: 'Trạng thái không hợp lệ.' },
      ]);
      const missing = await request(server())
        .patch(api('/999999/status'))
        .set(bearer(token))
        .send({ isActive: false })
        .expect(404);
      expect(missing.body.code).toBe('NOT_FOUND');
    });
  });

  describe('không xóa cứng người dùng', () => {
    it('không có route xóa; người dùng bị khóa vẫn còn trong danh sách', async () => {
      const target = await createUser('user');
      await request(server())
        .delete(api(`/${target.id}`))
        .set(bearer(token))
        .expect(404);
      await request(server())
        .patch(api(`/${target.id}/status`))
        .set(bearer(token))
        .send({ isActive: false })
        .expect(200);
      expect(await User.findByPk(target.id)).not.toBeNull();
    });
  });
});
