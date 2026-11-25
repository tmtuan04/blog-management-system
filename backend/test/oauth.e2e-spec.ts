import request from 'supertest';
import { RedisKeys } from '../src/common/utils/redis-keys';
import { RedisService } from '../src/infra/redis/redis.service';
import { GithubStrategy } from '../src/modules/auth/strategies/github.strategy';
import { OauthAccount } from '../src/modules/users/models/oauth-account.model';
import { User } from '../src/modules/users/models/user.model';
import { TestContext, createTestApp } from './helpers/app';
import { TEST_PASSWORD, bearer, createUser } from './helpers/auth';
import { resetDatabase } from './helpers/db';

/** Profile như passport-github2 trả khi bật allRawEmails */
interface FakeGithubProfile {
  id: string;
  displayName: string;
  username: string;
  emails: { value: string; primary: boolean; verified: boolean }[];
  photos: { value: string }[];
}

type TokenCallback = (err: unknown, accessToken?: string) => void;
type ProfileCallback = (err: unknown, profile?: FakeGithubProfile) => void;

/** Phần của passport-oauth2 gọi mạng, thay bằng hàm giả trong test */
interface GithubStrategyInternals {
  _oauth2: {
    getOAuthAccessToken: (
      code: string,
      params: object,
      callback: TokenCallback,
    ) => void;
  };
  userProfile: (accessToken: string, done: ProfileCallback) => void;
}

/**
 * UC20 GitHub. Không gọi GitHub thật: bước đổi `code` lấy access token và bước đọc
 * profile của passport-github2 được thay bằng hàm giả, còn lại (guard, strategy,
 * service, database, Redis, chuyển hướng) chạy thật.
 */
describe('OAuth GitHub UC20 (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const FRONTEND = 'http://localhost:4200/oauth/callback';

  /** Profile GitHub sẽ trả ở lần callback tiếp theo; null = GitHub lỗi khi đổi code */
  let githubProfile: FakeGithubProfile | null;

  const profileOf = (
    overrides: Partial<FakeGithubProfile> = {},
  ): FakeGithubProfile => ({
    id: '583231',
    displayName: 'The Octocat',
    username: 'octocat',
    emails: [{ value: 'octocat@github.test', primary: true, verified: true }],
    photos: [{ value: 'https://avatars.githubusercontent.com/u/583231' }],
    ...overrides,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const strategy = ctx.app.get<GithubStrategy, GithubStrategyInternals>(
      GithubStrategy,
    );
    strategy._oauth2.getOAuthAccessToken = (_code, _params, callback) => {
      if (githubProfile) {
        callback(null, 'github-access-token');
      } else {
        callback(new Error('bad_verification_code'));
      }
    };
    strategy.userProfile = (_accessToken, done) => done(null, githubProfile!);
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    githubProfile = profileOf();
  });

  afterAll(() => ctx.app.close());

  const redis = () => ctx.app.get(RedisService).client;

  /** Gọi callback như GitHub chuyển hướng về, trả URL frontend nhận được */
  const callback = async (query = 'code=github-code'): Promise<URL> => {
    const res = await request(server())
      .get(`/api/v1/auth/github/callback?${query}`)
      .expect(302);
    return new URL(res.headers.location);
  };

  /** Callback thành công, trả mã đổi token */
  const callbackCode = async (): Promise<string> => {
    const location = await callback();
    expect(`${location.origin}${location.pathname}`).toBe(FRONTEND);
    expect(location.searchParams.get('error')).toBeNull();
    const code = location.searchParams.get('code');
    expect(code).toMatch(/^[\w-]{43}$/);
    return code!;
  };

  const exchange = (code: unknown) =>
    request(server()).post('/api/v1/auth/oauth/exchange').send({ code });

  describe('GET /auth/github', () => {
    it('302 sang trang đăng nhập GitHub, xin scope user:email', async () => {
      const res = await request(server())
        .get('/api/v1/auth/github')
        .expect(302);
      const location = new URL(res.headers.location);
      expect(`${location.origin}${location.pathname}`).toBe(
        'https://github.com/login/oauth/authorize',
      );
      expect(location.searchParams.get('client_id')).toBe('test-github-client');
      expect(location.searchParams.get('scope')).toBe('user:email');
      expect(location.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/v1/auth/github/callback',
      );
    });
  });

  describe('GET /auth/github/callback', () => {
    it('chưa có tài khoản: tạo user role user, chưa có mật khẩu, kèm liên kết GitHub', async () => {
      await callbackCode();

      const user = await User.scope('withPassword').findOne({
        where: { email: 'octocat@github.test' },
        include: ['role'],
      });
      expect(user).not.toBeNull();
      expect(user!.fullName).toBe('The Octocat');
      expect(user!.passwordHash).toBeNull();
      expect(user!.avatar).toBe(
        'https://avatars.githubusercontent.com/u/583231',
      );
      expect(user!.role!.code).toBe('user');

      const accounts = await OauthAccount.findAll();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatchObject({
        userId: user!.id,
        provider: 'github',
        providerUserId: '583231',
        providerEmail: 'octocat@github.test',
      });
    });

    it('mã lưu trong Redis tối đa 60 giây', async () => {
      const code = await callbackCode();
      const ttl = await redis().ttl(RedisKeys.oauthCode(code));
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('đăng nhập lần 2 bằng cùng tài khoản GitHub: dùng lại tài khoản, không tạo thêm', async () => {
      await callbackCode();
      githubProfile = profileOf({ displayName: 'Tên mới trên GitHub' });
      await callbackCode();

      expect(await User.count()).toBe(1);
      expect(await OauthAccount.count()).toBe(1);
      // Không ghi đè họ tên người dùng đã có
      const user = await User.findOne();
      expect(user!.fullName).toBe('The Octocat');
    });

    it('trùng email với tài khoản có sẵn: liên kết vào tài khoản đó, mật khẩu vẫn dùng được', async () => {
      const existing = await createUser('blog_owner', {
        email: 'octocat@github.test',
        fullName: 'Chủ blog',
      });

      await callbackCode();

      expect(await User.count()).toBe(1);
      const account = await OauthAccount.findOne();
      expect(account!.userId).toBe(existing.id);
      await request(server())
        .post('/api/v1/auth/login')
        .send({ email: 'octocat@github.test', password: TEST_PASSWORD })
        .expect(200);
    });

    it('chỉ email chưa xác minh: ?error=OAUTH_NO_EMAIL, không tạo tài khoản', async () => {
      githubProfile = profileOf({
        emails: [
          { value: 'victim@github.test', primary: true, verified: false },
        ],
      });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('OAUTH_NO_EMAIL');
      expect(location.searchParams.get('code')).toBeNull();
      expect(await User.count()).toBe(0);
    });

    it('email chưa xác minh trùng tài khoản có sẵn: không liên kết (chống chiếm tài khoản)', async () => {
      await createUser('super_admin', { email: 'victim@github.test' });
      githubProfile = profileOf({
        emails: [
          { value: 'victim@github.test', primary: true, verified: false },
        ],
      });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('OAUTH_NO_EMAIL');
      expect(await OauthAccount.count()).toBe(0);
    });

    it('tài khoản trùng email bị khóa: ?error=ACCOUNT_LOCKED, không ghi liên kết', async () => {
      await createUser('user', {
        email: 'octocat@github.test',
        isActive: false,
      });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('ACCOUNT_LOCKED');
      expect(await OauthAccount.count()).toBe(0);
    });

    it('tài khoản đã liên kết bị khóa: ?error=ACCOUNT_LOCKED', async () => {
      await callbackCode();
      await User.update({ isActive: false }, { where: {} });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('ACCOUNT_LOCKED');
    });

    it('tài khoản trùng email đã liên kết một GitHub khác: ?error=OAUTH_FAILED', async () => {
      await callbackCode();
      githubProfile = profileOf({ id: '999999', username: 'octocat-2' });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('OAUTH_FAILED');
      expect(await OauthAccount.count()).toBe(1);
    });

    it('người dùng bấm Cancel trên GitHub: ?error=OAUTH_FAILED', async () => {
      const location = await callback(
        'error=access_denied&error_description=The+user+has+denied',
      );
      expect(`${location.origin}${location.pathname}`).toBe(FRONTEND);
      expect(location.searchParams.get('error')).toBe('OAUTH_FAILED');
    });

    it('GitHub lỗi khi đổi code lấy token: ?error=OAUTH_FAILED', async () => {
      githubProfile = null;
      const location = await callback();
      expect(location.searchParams.get('error')).toBe('OAUTH_FAILED');
      expect(await User.count()).toBe(0);
    });
  });

  describe('POST /auth/oauth/exchange', () => {
    it('200: cặp token + user, không có passwordHash; access token dùng được', async () => {
      const code = await callbackCode();

      const res = await exchange(code).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(Number),
          fullName: 'The Octocat',
          email: 'octocat@github.test',
          avatar: 'https://avatars.githubusercontent.com/u/583231',
          role: 'user',
        },
      });
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);

      const me = await request(server())
        .get('/api/v1/auth/me')
        .set(bearer(res.body.data.accessToken))
        .expect(200);
      expect(me.body.data.email).toBe('octocat@github.test');

      // Tài khoản OAuth chưa đặt mật khẩu (UC12)
      const profile = await request(server())
        .get('/api/v1/profile')
        .set(bearer(res.body.data.accessToken))
        .expect(200);
      expect(profile.body.data.hasPassword).toBe(false);
    });

    it('refresh token nhận được dùng được như đăng nhập bằng mật khẩu', async () => {
      const res = await exchange(await callbackCode()).expect(200);
      await request(server())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: res.body.data.refreshToken })
        .expect(200);
    });

    it('mã chỉ dùng một lần: lần 2 → 400 OAUTH_CODE_INVALID', async () => {
      const code = await callbackCode();
      await exchange(code).expect(200);

      const res = await exchange(code).expect(400);
      expect(res.body).toMatchObject({
        success: false,
        code: 'OAUTH_CODE_INVALID',
        message:
          'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
      });
    });

    it('mã không tồn tại hoặc đã hết hạn: 400 OAUTH_CODE_INVALID', async () => {
      const res = await exchange('khong-ton-tai').expect(400);
      expect(res.body.code).toBe('OAUTH_CODE_INVALID');
    });

    it('thiếu code: 400 lỗi ở field code', async () => {
      const res = await request(server())
        .post('/api/v1/auth/oauth/exchange')
        .send({})
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual([
        { field: 'code', message: 'Vui lòng nhập trường này.' },
      ]);
    });

    it('code không phải chuỗi: 400 lỗi ở field code', async () => {
      const res = await exchange(12345).expect(400);
      expect(res.body.errors[0].field).toBe('code');
    });

    it('bị khóa giữa lúc callback và lúc đổi mã: 403 ACCOUNT_LOCKED', async () => {
      const code = await callbackCode();
      await User.update({ isActive: false }, { where: {} });

      const res = await exchange(code).expect(403);
      expect(res.body.code).toBe('ACCOUNT_LOCKED');
    });
  });
});
