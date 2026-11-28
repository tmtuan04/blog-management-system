import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { fakeJwt } from '../auth/testing/jwt.testing';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../auth/token-storage';
import { API_INTERCEPTORS } from '.';

const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };
const expiredBody = {
  success: false,
  code: 'TOKEN_EXPIRED',
  message: 'Phiên đăng nhập đã hết hạn',
};
const ok = <T>(data: T) => ({ success: true, message: 'OK', data });

describe('refreshInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const tokenA = fakeJwt(15 * 60, 1);
  const tokenB = fakeJwt(15 * 60, 2);

  function storeTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  function expectRefresh(refreshToken: string) {
    const req = backend.expectOne('/api/v1/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken });
    expect(req.request.headers.has('Authorization')).toBe(false);
    return req;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors(API_INTERCEPTORS)),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('401 TOKEN_EXPIRED: refresh, lưu cặp token mới, gửi lại request với token mới', () => {
    storeTokens(tokenA, 'refresh-1');
    let result: unknown;
    http.get('/admin/posts').subscribe((res) => (result = res));

    const first = backend.expectOne('/api/v1/admin/posts');
    expect(first.request.headers.get('Authorization')).toBe(`Bearer ${tokenA}`);
    first.flush(expiredBody, UNAUTHORIZED);

    expectRefresh('refresh-1').flush(
      ok({ accessToken: tokenB, refreshToken: 'refresh-2' }),
    );

    const retry = backend.expectOne('/api/v1/admin/posts');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${tokenB}`);
    retry.flush(ok([]));

    expect(result).toEqual(ok([]));
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(tokenB);
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('nhiều request cùng hết hạn chỉ gọi refresh một lần', () => {
    storeTokens(tokenA, 'refresh-1');
    const results: unknown[] = [];
    http.get('/admin/posts').subscribe((res) => results.push(res));
    http.get('/admin/categories').subscribe((res) => results.push(res));

    backend.expectOne('/api/v1/admin/posts').flush(expiredBody, UNAUTHORIZED);
    backend
      .expectOne('/api/v1/admin/categories')
      .flush(expiredBody, UNAUTHORIZED);

    const refreshes = backend.match('/api/v1/auth/refresh');
    expect(refreshes).toHaveLength(1);
    refreshes[0].flush(ok({ accessToken: tokenB, refreshToken: 'refresh-2' }));

    for (const url of ['/api/v1/admin/posts', '/api/v1/admin/categories']) {
      const retry = backend.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe(
        `Bearer ${tokenB}`,
      );
      retry.flush(ok(url));
    }
    expect(results).toHaveLength(2);
  });

  it('refresh lỗi: xóa phiên, chuyển /login kèm returnUrl và sessionError, ném lỗi gốc', () => {
    storeTokens(tokenA, 'refresh-1');
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(
      '/admin/posts?page=2',
    );
    let error: unknown;
    http.get('/admin/posts').subscribe({ error: (e: unknown) => (error = e) });

    backend.expectOne('/api/v1/admin/posts').flush(expiredBody, UNAUTHORIZED);
    expectRefresh('refresh-1').flush(expiredBody, UNAUTHORIZED);

    expect(error).toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' });
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        sessionError: 'TOKEN_EXPIRED',
        returnUrl: '/admin/posts?page=2',
      },
    });
  });

  it('tab khác vừa refresh: dùng token mới trong localStorage, không refresh nữa', () => {
    storeTokens(tokenA, 'refresh-1');
    http.get('/admin/posts').subscribe();
    const first = backend.expectOne('/api/v1/admin/posts');

    storeTokens(tokenB, 'refresh-2'); // tab khác ghi cặp token mới
    first.flush(expiredBody, UNAUTHORIZED);

    backend.expectNone('/api/v1/auth/refresh');
    const retry = backend.expectOne('/api/v1/admin/posts');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${tokenB}`);
    retry.flush(ok([]));
  });

  it('hai tab refresh cùng lúc, tab này thua: dùng cặp token tab kia vừa ghi, không đăng xuất', () => {
    storeTokens(tokenA, 'refresh-1');
    http.get('/admin/posts').subscribe();
    backend.expectOne('/api/v1/admin/posts').flush(expiredBody, UNAUTHORIZED);

    const refresh = expectRefresh('refresh-1');
    storeTokens(tokenB, 'refresh-2'); // tab kia refresh xong trước, refresh-1 bị thu hồi
    refresh.flush(expiredBody, UNAUTHORIZED);

    const retry = backend.expectOne('/api/v1/admin/posts');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${tokenB}`);
    retry.flush(ok([]));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('request gửi lại vẫn 401: hết phiên, không refresh lần hai', () => {
    storeTokens(tokenA, 'refresh-1');
    let error: unknown;
    http.get('/admin/posts').subscribe({ error: (e: unknown) => (error = e) });

    backend.expectOne('/api/v1/admin/posts').flush(expiredBody, UNAUTHORIZED);
    expectRefresh('refresh-1').flush(
      ok({ accessToken: tokenB, refreshToken: 'refresh-2' }),
    );
    backend.expectOne('/api/v1/admin/posts').flush(expiredBody, UNAUTHORIZED);

    backend.expectNone('/api/v1/auth/refresh');
    expect(error).toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { sessionError: 'UNAUTHORIZED' },
    });
  });

  it('403 ACCOUNT_LOCKED khi đang dùng: xóa phiên, chuyển /login với sessionError=ACCOUNT_LOCKED', () => {
    storeTokens(tokenA, 'refresh-1');
    http.get('/profile').subscribe({ error: () => undefined });
    backend
      .expectOne('/api/v1/profile')
      .flush(
        { success: false, code: 'ACCOUNT_LOCKED', message: 'Bị khóa' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { sessionError: 'ACCOUNT_LOCKED' },
    });
  });

  it('403 FORBIDDEN không phải lỗi phiên: giữ phiên, để component hiện màn 403', () => {
    storeTokens(tokenA, 'refresh-1');
    http.get('/admin/posts/9').subscribe({ error: () => undefined });
    backend
      .expectOne('/api/v1/admin/posts/9')
      .flush(
        { success: false, code: 'FORBIDDEN', message: 'Không có quyền' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(tokenA);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('đăng nhập sai (401 INVALID_CREDENTIALS) là lỗi của form, không chuyển trang', () => {
    let error: unknown;
    TestBed.inject(AuthService)
      .login({ email: 'a@b.c', password: 'wrong123' })
      .subscribe({ error: (e: unknown) => (error = e) });

    const req = backend.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(
      { success: false, code: 'INVALID_CREDENTIALS', message: 'Sai' },
      UNAUTHORIZED,
    );

    expect(error).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('access token đã hết hạn trước khi gửi (authInterceptor)', () => {
    it('refresh trước, rồi mới gửi request với token mới', () => {
      storeTokens(fakeJwt(-60), 'refresh-1');
      http.get('/posts/hello').subscribe();

      backend.expectNone('/api/v1/posts/hello');
      expectRefresh('refresh-1').flush(
        ok({ accessToken: tokenB, refreshToken: 'refresh-2' }),
      );

      const req = backend.expectOne('/api/v1/posts/hello');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${tokenB}`);
      req.flush(ok({}));
    });

    it('refresh lỗi: xóa phiên, vẫn gửi request như khách (trang public vẫn xem được)', () => {
      storeTokens(fakeJwt(-60), 'refresh-1');
      let result: unknown;
      http.get('/posts/hello').subscribe((res) => (result = res));

      expectRefresh('refresh-1').flush(expiredBody, UNAUTHORIZED);

      const req = backend.expectOne('/api/v1/posts/hello');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush(ok({ title: 'Hello' }));

      expect(result).toEqual(ok({ title: 'Hello' }));
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
