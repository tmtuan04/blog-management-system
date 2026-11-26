import request from 'supertest';
import { GithubStrategy } from '../src/modules/auth/strategies/github.strategy';
import { GoogleStrategy } from '../src/modules/auth/strategies/google.strategy';
import { OauthAccount } from '../src/modules/users/models/oauth-account.model';
import { User } from '../src/modules/users/models/user.model';
import { TestContext, createTestApp } from './helpers/app';
import { TEST_PASSWORD, bearer, createUser } from './helpers/auth';
import { resetDatabase } from './helpers/db';

/** Profile như passport-google-oauth20 dựng từ userinfo của Google */
interface FakeGoogleProfile {
  id: string;
  displayName?: string;
  emails?: { value: string; verified: boolean }[];
  photos?: { value: string }[];
}

/** Profile như passport-github2 trả khi bật allRawEmails */
interface FakeGithubProfile {
  id: string;
  displayName: string;
  username: string;
  emails: { value: string; primary: boolean; verified: boolean }[];
  photos: { value: string }[];
}

type TokenCallback = (err: unknown, accessToken?: string) => void;
type ProfileCallback<P> = (err: unknown, profile?: P) => void;

/** Phần của passport-oauth2 gọi mạng, thay bằng hàm giả trong test */
interface StrategyInternals<P> {
  _oauth2: {
    getOAuthAccessToken: (
      code: string,
      params: object,
      callback: TokenCallback,
    ) => void;
  };
  userProfile: (accessToken: string, done: ProfileCallback<P>) => void;
}

/**
 * Thay bước đổi `code` lấy access token và bước đọc profile bằng hàm giả.
 * `getProfile()` trả null = provider lỗi khi đổi code.
 */
function mockStrategy<P>(
  strategy: StrategyInternals<P>,
  getProfile: () => P | null,
): void {
  strategy._oauth2.getOAuthAccessToken = (_code, _params, callback) => {
    if (getProfile()) {
      callback(null, 'provider-access-token');
    } else {
      callback(new Error('invalid_grant'));
    }
  };
  strategy.userProfile = (_accessToken, done) => done(null, getProfile()!);
}

/**
 * UC20 Google. Không gọi Google thật: giống test/oauth.e2e-spec.ts, chỉ thay phần gọi
 * mạng của passport, còn guard, strategy, service, MySQL, Redis chạy thật. Phần dùng
 * chung với GitHub (exchange, khóa tài khoản, mã một lần) đã test ở file GitHub, file
 * này test phần riêng của Google và đăng nhập cùng email qua cả hai provider.
 */
describe('OAuth Google UC20 (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const FRONTEND = 'http://localhost:4200/oauth/callback';
  const EMAIL = 'nguyenvana@gmail.test';

  let googleProfile: FakeGoogleProfile | null;
  let githubProfile: FakeGithubProfile | null;

  const googleProfileOf = (
    overrides: Partial<FakeGoogleProfile> = {},
  ): FakeGoogleProfile => ({
    id: '109876543210987654321',
    displayName: 'Nguyễn Văn A',
    emails: [{ value: EMAIL, verified: true }],
    photos: [{ value: 'https://lh3.googleusercontent.com/a/abc=s96-c' }],
    ...overrides,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    mockStrategy(
      ctx.app.get<GoogleStrategy, StrategyInternals<FakeGoogleProfile>>(
        GoogleStrategy,
      ),
      () => googleProfile,
    );
    mockStrategy(
      ctx.app.get<GithubStrategy, StrategyInternals<FakeGithubProfile>>(
        GithubStrategy,
      ),
      () => githubProfile,
    );
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    googleProfile = googleProfileOf();
    githubProfile = {
      id: '583231',
      displayName: 'Văn A trên GitHub',
      username: 'vana',
      emails: [{ value: EMAIL, primary: true, verified: true }],
      photos: [{ value: 'https://avatars.githubusercontent.com/u/583231' }],
    };
  });

  afterAll(() => ctx.app.close());

  /** Gọi callback như provider chuyển hướng về, trả URL frontend nhận được */
  const callback = async (
    provider: 'google' | 'github' = 'google',
    query = 'code=provider-code',
  ): Promise<URL> => {
    const res = await request(server())
      .get(`/api/v1/auth/${provider}/callback?${query}`)
      .expect(302);
    const location = new URL(res.headers.location);
    expect(`${location.origin}${location.pathname}`).toBe(FRONTEND);
    return location;
  };

  /** Callback thành công rồi đổi mã, trả dữ liệu đăng nhập */
  const login = async (provider: 'google' | 'github' = 'google') => {
    const location = await callback(provider);
    expect(location.searchParams.get('error')).toBeNull();
    const res = await request(server())
      .post('/api/v1/auth/oauth/exchange')
      .send({ code: location.searchParams.get('code') })
      .expect(200);
    return res.body.data as {
      accessToken: string;
      user: { id: number; fullName: string; email: string };
    };
  };

  describe('GET /auth/google', () => {
    it('302 sang Google, xin scope profile email, luôn hiện màn chọn tài khoản', async () => {
      const res = await request(server())
        .get('/api/v1/auth/google')
        .expect(302);
      const location = new URL(res.headers.location);
      expect(`${location.origin}${location.pathname}`).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
      expect(location.searchParams.get('client_id')).toBe('test-google-client');
      expect(location.searchParams.get('scope')).toBe('profile email');
      expect(location.searchParams.get('prompt')).toBe('select_account');
      expect(location.searchParams.get('response_type')).toBe('code');
      expect(location.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/v1/auth/google/callback',
      );
    });
  });

  describe('GET /auth/google/callback', () => {
    it('chưa có tài khoản: tạo user role user, chưa có mật khẩu, kèm liên kết Google; token dùng được', async () => {
      const data = await login();

      expect(data.user).toMatchObject({
        fullName: 'Nguyễn Văn A',
        email: EMAIL,
        avatar: 'https://lh3.googleusercontent.com/a/abc=s96-c',
        role: 'user',
      });
      const user = await User.scope('withPassword').findByPk(data.user.id);
      expect(user!.passwordHash).toBeNull();

      const accounts = await OauthAccount.findAll();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatchObject({
        userId: data.user.id,
        provider: 'google',
        providerUserId: '109876543210987654321',
        providerEmail: EMAIL,
      });

      const me = await request(server())
        .get('/api/v1/auth/me')
        .set(bearer(data.accessToken))
        .expect(200);
      expect(me.body.data.email).toBe(EMAIL);
    });

    it('đăng nhập lần 2 bằng cùng tài khoản Google: dùng lại tài khoản', async () => {
      const first = await login();
      const second = await login();

      expect(second.user.id).toBe(first.user.id);
      expect(await User.count()).toBe(1);
      expect(await OauthAccount.count()).toBe(1);
    });

    it('email Google viết hoa, trùng tài khoản đăng ký bằng mật khẩu: liên kết vào tài khoản đó', async () => {
      const existing = await createUser('blog_owner', { email: EMAIL });
      googleProfile = googleProfileOf({
        emails: [{ value: '  NguyenVanA@Gmail.TEST ', verified: true }],
      });

      const data = await login();

      expect(data.user.id).toBe(existing.id);
      expect(await User.count()).toBe(1);
      await request(server())
        .post('/api/v1/auth/login')
        .send({ email: EMAIL, password: TEST_PASSWORD })
        .expect(200);
    });

    it('email chưa xác minh (email_verified = false): ?error=OAUTH_NO_EMAIL, không tạo tài khoản', async () => {
      googleProfile = googleProfileOf({
        emails: [{ value: EMAIL, verified: false }],
      });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('OAUTH_NO_EMAIL');
      expect(location.searchParams.get('code')).toBeNull();
      expect(await User.count()).toBe(0);
    });

    it('email chưa xác minh trùng tài khoản có sẵn: không liên kết (chống chiếm tài khoản)', async () => {
      await createUser('super_admin', { email: EMAIL });
      googleProfile = googleProfileOf({
        emails: [{ value: EMAIL, verified: false }],
      });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('OAUTH_NO_EMAIL');
      expect(await OauthAccount.count()).toBe(0);
    });

    it('Google không trả email: ?error=OAUTH_NO_EMAIL', async () => {
      googleProfile = googleProfileOf({ emails: undefined });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('OAUTH_NO_EMAIL');
    });

    it('không có tên Google: họ tên lấy phần trước @ của email', async () => {
      googleProfile = googleProfileOf({ displayName: undefined });

      const data = await login();

      expect(data.user.fullName).toBe('nguyenvana');
    });

    it('tài khoản trùng email đã liên kết một Google khác: ?error=OAUTH_FAILED', async () => {
      await login();
      googleProfile = googleProfileOf({ id: '200000000000000000000' });

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('OAUTH_FAILED');
      expect(await OauthAccount.count()).toBe(1);
    });

    it('người dùng bấm Cancel trên Google: ?error=OAUTH_FAILED', async () => {
      const location = await callback('google', 'error=access_denied');
      expect(location.searchParams.get('error')).toBe('OAUTH_FAILED');
    });

    it('Google lỗi khi đổi code lấy token: ?error=OAUTH_FAILED, không tạo tài khoản', async () => {
      googleProfile = null;

      const location = await callback();

      expect(location.searchParams.get('error')).toBe('OAUTH_FAILED');
      expect(await User.count()).toBe(0);
    });
  });

  describe('Cùng email qua GitHub và Google', () => {
    it('GitHub trước, Google sau: một tài khoản, hai liên kết', async () => {
      const github = await login('github');
      const google = await login('google');

      expect(google.user.id).toBe(github.user.id);
      // Không ghi đè họ tên đã có từ lần đăng nhập GitHub
      expect(google.user.fullName).toBe('Văn A trên GitHub');
      expect(await User.count()).toBe(1);
      const providers = (await OauthAccount.findAll())
        .map((account) => account.provider)
        .sort();
      expect(providers).toEqual(['github', 'google']);
    });

    it('Google trước, GitHub sau: một tài khoản, đăng nhập lại bằng cả hai đều được', async () => {
      const google = await login('google');
      const github = await login('github');

      expect(github.user.id).toBe(google.user.id);
      expect((await login('google')).user.id).toBe(google.user.id);
      expect(await User.count()).toBe(1);
      expect(await OauthAccount.count()).toBe(2);
    });
  });
});
