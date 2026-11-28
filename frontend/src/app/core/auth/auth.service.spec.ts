import { provideApiTesting } from '../testing/provide-api-testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthUser } from '../models/auth-user.model';
import { AuthService } from './auth.service';
import { fakeJwt } from '../testing/jwt.testing';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './token-storage';

const ok = <T>(data: T) => ({ success: true, message: 'OK', data });
const owner: AuthUser = {
  id: 2,
  fullName: 'Blog Owner',
  email: 'owner@example.com',
  avatar: null,
  role: 'blog_owner',
};

describe('AuthService', () => {
  let auth: AuthService;
  let backend: HttpTestingController;
  let router: Router;

  const access = fakeJwt(15 * 60);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    auth = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  function storeTokens(): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');
  }

  describe('init (khởi động app)', () => {
    it('chưa có refresh token: không gọi API, là khách', async () => {
      await auth.init();
      expect(auth.isLoggedIn()).toBe(false);
    });

    it('có token: gọi GET /auth/me, lưu người dùng và role', async () => {
      storeTokens();
      const done = auth.init();
      const req = backend.expectOne('/api/v1/auth/me');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${access}`);
      req.flush(ok(owner));
      await done;

      expect(auth.user()).toEqual(owner);
      expect(auth.canWrite()).toBe(true);
      expect(auth.isSuperAdmin()).toBe(false);
    });

    it('phiên không còn hợp lệ: xóa token, coi như khách, không chuyển trang', async () => {
      storeTokens();
      const done = auth.init();
      backend.expectOne('/api/v1/auth/me').flush(
        {
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Vui lòng đăng nhập',
        },
        { status: 401, statusText: 'Unauthorized' },
      );
      await done;

      expect(auth.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('lỗi mạng: giữ token để lần tải sau thử lại', async () => {
      storeTokens();
      const done = auth.init();
      backend.expectOne('/api/v1/auth/me').error(new ProgressEvent('error'));
      await done;

      expect(auth.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
    });
  });

  describe('login', () => {
    it('lưu token và người dùng', () => {
      auth.login({ email: owner.email, password: 'Password123' }).subscribe();
      const req = backend.expectOne('/api/v1/auth/login');
      expect(req.request.body).toEqual({
        email: owner.email,
        password: 'Password123',
      });
      req.flush(
        ok({ accessToken: access, refreshToken: 'refresh-1', user: owner }),
      );

      expect(auth.user()).toEqual(owner);
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(access);
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
    });
  });

  describe('logout (UC04)', () => {
    beforeEach(() => {
      storeTokens();
      auth.setSession({
        accessToken: access,
        refreshToken: 'refresh-1',
        user: owner,
      });
    });

    it('gửi refreshToken, xóa phiên, về /', () => {
      auth.logout().subscribe();
      const req = backend.expectOne('/api/v1/auth/logout');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
      req.flush(ok(null));

      expect(auth.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('API lỗi vẫn xóa phiên và về /, không chuyển /login', () => {
      auth.logout().subscribe();
      backend
        .expectOne('/api/v1/auth/logout')
        .flush(
          { success: false, code: 'UNAUTHORIZED', message: 'x' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(auth.isLoggedIn()).toBe(false);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('đồng bộ giữa các tab', () => {
    it('tab khác đăng xuất: tab này về khách và về /', () => {
      auth.setSession({
        accessToken: access,
        refreshToken: 'refresh-1',
        user: owner,
      });
      localStorage.clear(); // tab khác xóa token
      window.dispatchEvent(
        new StorageEvent('storage', { key: REFRESH_TOKEN_KEY }),
      );

      expect(auth.isLoggedIn()).toBe(false);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('tab khác đăng nhập: tab này tải người dùng', () => {
      storeTokens(); // tab khác ghi token
      window.dispatchEvent(
        new StorageEvent('storage', { key: REFRESH_TOKEN_KEY }),
      );
      backend.expectOne('/api/v1/auth/me').flush(ok(owner));

      expect(auth.user()).toEqual(owner);
    });
  });

  it('updateUser: đổi tên, avatar để header đổi theo (UC12)', () => {
    auth.setSession({
      accessToken: access,
      refreshToken: 'refresh-1',
      user: owner,
    });
    auth.updateUser({ fullName: 'Tên mới', avatar: 'uploads/avatars/a.webp' });
    expect(auth.user()).toMatchObject({
      fullName: 'Tên mới',
      avatar: 'uploads/avatars/a.webp',
    });
  });
});
