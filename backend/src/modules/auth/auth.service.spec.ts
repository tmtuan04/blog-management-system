import { ConfigService } from '@nestjs/config';
import { hash } from 'bcrypt';
import { AppException } from '../../common/errors';
import { MailService } from '../../infra/mail/mail.service';
import { RedisService } from '../../infra/redis/redis.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let passwordHash: string;
  const client = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    getdel: jest.fn(),
  };
  const users = {
    emailExists: jest.fn(),
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updatePassword: jest.fn(),
  };
  const tokens = {
    issue: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
    consume: jest.fn(),
    revoke: jest.fn(),
    revokeAll: jest.fn(),
  };
  const mail = { sendPasswordReset: jest.fn() };
  const config = { get: () => 'http://localhost:4200' };
  const service = new AuthService(
    users as unknown as UsersService,
    tokens as unknown as TokenService,
    { client } as unknown as RedisService,
    mail as unknown as MailService,
    config as unknown as ConfigService,
  );

  const userOf = (overrides: Partial<User> = {}) =>
    ({
      id: 1,
      fullName: 'An',
      email: 'an@test.local',
      avatar: null,
      passwordHash,
      isActive: true,
      role: { code: 'user' },
      ...overrides,
    }) as unknown as User;

  const errorOf = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error('phải ném lỗi');
      },
      (e: unknown) => e as AppException,
    );

  beforeAll(async () => {
    passwordHash = await hash('Password123', 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    client.get.mockResolvedValue(null);
  });

  describe('register', () => {
    it('email trùng thì 409 kèm errors[{ field: email }]', async () => {
      users.emailExists.mockResolvedValue(true);
      const error = await errorOf(
        service.register({
          fullName: 'An',
          email: 'an@test.local',
          password: 'Password123',
          confirmPassword: 'Password123',
        }),
      );
      expect(error.getStatus()).toBe(409);
      expect(error.errors).toEqual([
        { field: 'email', message: 'Email này đã được đăng ký.' },
      ]);
    });

    it('tạo tài khoản role user, mật khẩu đã băm bcrypt', async () => {
      users.emailExists.mockResolvedValue(false);
      users.create.mockImplementation((input: { passwordHash: string }) =>
        Promise.resolve(userOf({ passwordHash: input.passwordHash })),
      );
      const result = await service.register({
        fullName: 'An',
        email: 'an@test.local',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      const input = users.create.mock.calls[0][0] as {
        role: string;
        passwordHash: string;
      };
      expect(input.role).toBe('user');
      expect(input.passwordHash).toMatch(/^\$2b\$10\$/);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toEqual({
        id: 1,
        fullName: 'An',
        email: 'an@test.local',
        avatar: null,
        role: 'user',
      });
    });
  });

  describe('login', () => {
    const dto = { email: 'an@test.local', password: 'Password123' };

    it('đúng thì trả token + user và xóa bộ đếm lần sai', async () => {
      users.findByEmail.mockResolvedValue(userOf());
      const result = await service.login(dto, '1.1.1.1');
      expect(result).toMatchObject({ accessToken: 'a', refreshToken: 'r' });
      expect(result.user.role).toBe('user');
      expect(client.del).toHaveBeenCalledWith(
        'auth:login-fail:1.1.1.1:an@test.local',
      );
      expect(tokens.issue).toHaveBeenCalledWith({ id: 1, role: 'user' });
    });

    it('sai mật khẩu: 401 INVALID_CREDENTIALS, tăng bộ đếm và đặt TTL 15 phút ở lần đầu', async () => {
      users.findByEmail.mockResolvedValue(userOf());
      client.incr.mockResolvedValue(1);
      const error = await errorOf(
        service.login({ ...dto, password: 'Sai12345' }, '1.1.1.1'),
      );
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.message).toBe('Email hoặc mật khẩu không đúng.');
      expect(client.expire).toHaveBeenCalledWith(
        'auth:login-fail:1.1.1.1:an@test.local',
        900,
      );
    });

    it('email không tồn tại cũng trả cùng thông báo', async () => {
      users.findByEmail.mockResolvedValue(null);
      client.incr.mockResolvedValue(2);
      const error = await errorOf(service.login(dto, '1.1.1.1'));
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(client.expire).not.toHaveBeenCalled();
    });

    it('tài khoản OAuth chưa có mật khẩu thì không đăng nhập bằng mật khẩu được', async () => {
      users.findByEmail.mockResolvedValue(userOf({ passwordHash: null }));
      client.incr.mockResolvedValue(1);
      const error = await errorOf(service.login(dto, '1.1.1.1'));
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });

    it('lần thứ 6 sau 5 lần sai: 429, không kiểm tra mật khẩu', async () => {
      client.get.mockResolvedValue('5');
      const error = await errorOf(service.login(dto, '1.1.1.1'));
      expect(error.getStatus()).toBe(429);
      expect(users.findByEmail).not.toHaveBeenCalled();
    });

    it('tài khoản bị khóa: 403 ACCOUNT_LOCKED, không cấp token', async () => {
      users.findByEmail.mockResolvedValue(userOf({ isActive: false }));
      const error = await errorOf(service.login(dto, '1.1.1.1'));
      expect(error.code).toBe('ACCOUNT_LOCKED');
      expect(tokens.issue).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('cấp cặp token mới với role hiện tại', async () => {
      tokens.consume.mockResolvedValue(1);
      users.findById.mockResolvedValue(
        userOf({ role: { code: 'blog_owner' } as never }),
      );
      await service.refresh('r');
      expect(tokens.issue).toHaveBeenCalledWith({ id: 1, role: 'blog_owner' });
    });

    it('tài khoản đã bị khóa: 403', async () => {
      tokens.consume.mockResolvedValue(1);
      users.findById.mockResolvedValue(userOf({ isActive: false }));
      const error = await errorOf(service.refresh('r'));
      expect(error.code).toBe('ACCOUNT_LOCKED');
    });

    it('user không còn tồn tại: 401 TOKEN_EXPIRED', async () => {
      tokens.consume.mockResolvedValue(1);
      users.findById.mockResolvedValue(null);
      const error = await errorOf(service.refresh('r'));
      expect(error.code).toBe('TOKEN_EXPIRED');
    });
  });

  it('logout thu hồi refresh token của user', async () => {
    await service.logout('r', 3);
    expect(tokens.revoke).toHaveBeenCalledWith('r', 3);
  });

  describe('forgotPassword', () => {
    it('email có thật: lưu token 15 phút và gửi link có token', async () => {
      users.findByEmail.mockResolvedValue(userOf());
      await service.forgotPassword('an@test.local');
      const [key, value, , ttl] = client.set.mock.calls[0] as [
        string,
        string,
        string,
        number,
      ];
      expect(key).toMatch(/^auth:reset:[0-9a-f]{64}$/);
      expect(value).toBe('1');
      expect(ttl).toBe(900);
      const link = mail.sendPasswordReset.mock.calls[0][2] as string;
      expect(link).toBe(
        `http://localhost:4200/reset-password?token=${key.split(':')[2]}`,
      );
    });

    it('email không tồn tại hoặc bị khóa: không gửi gì, không báo lỗi', async () => {
      users.findByEmail.mockResolvedValueOnce(null);
      await service.forgotPassword('x@test.local');
      users.findByEmail.mockResolvedValueOnce(userOf({ isActive: false }));
      await service.forgotPassword('an@test.local');
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('gửi email lỗi thì chỉ ghi log', async () => {
      users.findByEmail.mockResolvedValue(userOf());
      mail.sendPasswordReset.mockRejectedValueOnce(new Error('SMTP down'));
      await expect(
        service.forgotPassword('an@test.local'),
      ).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    const dto = {
      token: 't',
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    };

    it('token hợp lệ: đổi mật khẩu, xóa token (GETDEL), thu hồi mọi phiên', async () => {
      client.getdel.mockResolvedValue('1');
      users.findById.mockResolvedValue(userOf());
      await service.resetPassword(dto);
      expect(client.getdel).toHaveBeenCalledWith('auth:reset:t');
      expect(users.updatePassword).toHaveBeenCalledWith(
        1,
        expect.stringMatching(/^\$2b\$/),
      );
      expect(tokens.revokeAll).toHaveBeenCalledWith(1);
    });

    it('token sai, hết hạn hoặc đã dùng: 400 RESET_TOKEN_INVALID', async () => {
      client.getdel.mockResolvedValue(null);
      const error = await errorOf(service.resetPassword(dto));
      expect(error.getStatus()).toBe(400);
      expect(error.code).toBe('RESET_TOKEN_INVALID');
      expect(users.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('trả thông tin user + role', async () => {
      users.findById.mockResolvedValue(
        userOf({ role: { code: 'super_admin' } as never }),
      );
      await expect(service.me(1)).resolves.toMatchObject({
        role: 'super_admin',
      });
    });

    it('user không còn tồn tại: 401', async () => {
      users.findById.mockResolvedValue(null);
      const error = await errorOf(service.me(1));
      expect(error.getStatus()).toBe(401);
    });
  });
});
