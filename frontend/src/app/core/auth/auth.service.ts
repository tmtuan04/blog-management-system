import { HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { Params, Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  map,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { ApiError, ApiErrorCode, ApiResponse } from '../api/api.models';
import { unwrap } from '../api/unwrap';
import { AuthUser } from '../models/auth-user.model';
import { noSessionRedirect, skipAuth } from './auth-context';
import { LoginRequest, LoginResponse, TokenPair } from './auth.models';
import { isTokenExpired } from './jwt';
import { hasRole } from './roles';
import { REFRESH_TOKEN_KEY, TokenStorage } from './token-storage';

/** Lý do hết phiên, gửi lên `/login?sessionError=` để màn đăng nhập hiện `error.<code>`. */
export type SessionEndReason = Extract<
  ApiErrorCode,
  'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'ACCOUNT_LOCKED'
>;

const NO_SESSION: ApiError = {
  status: 401,
  code: 'UNAUTHORIZED',
  message: 'No refresh token',
  errors: [],
};

/**
 * Phiên đăng nhập (UC02, UC04; docs/phase-4-frontend.md mục 3.2).
 * Component đọc `user`, `isLoggedIn`, `canWrite`, `isSuperAdmin`; không tự đọc localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokens = inject(TokenStorage);

  private readonly currentUser = signal<AuthUser | null>(null);
  /** Refresh đang chạy, dùng chung cho mọi request hết hạn cùng lúc */
  private refreshing$: Observable<string> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly role = computed(() => this.currentUser()?.role ?? null);
  /** Blog Owner, Super Admin: nút "Viết bài", trang quản lý bài viết */
  readonly canWrite = computed(() => {
    const role = this.role();
    return role !== null && hasRole(role, ['blog_owner']);
  });
  readonly isSuperAdmin = computed(() => this.role() === 'super_admin');

  constructor() {
    this.syncAcrossTabs();
  }

  /**
   * Chạy trong provideAppInitializer, trước khi router chạy, để guard và header biết role ngay.
   * Có refresh token thì gọi `GET /auth/me`. Lỗi phiên thì xóa token, coi như khách (không chuyển trang).
   * Lỗi mạng thì giữ token, lần tải sau thử lại.
   */
  init(): Promise<void> {
    if (!this.tokens.refreshToken) return Promise.resolve();
    return firstValueFrom(
      this.fetchMe().pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
      ),
    );
  }

  login(body: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<ApiResponse<LoginResponse>>('/auth/login', body, {
        context: skipAuth(),
      })
      .pipe(
        unwrap(),
        tap((res) => this.setSession(res)),
        map((res) => res.user),
      );
  }

  /** UC04: thu hồi refresh token ở backend. Thành công hay lỗi đều xóa phiên và về `/`. */
  logout(): Observable<void> {
    const refreshToken = this.tokens.refreshToken;
    const request$: Observable<unknown> = refreshToken
      ? this.http.post(
          '/auth/logout',
          { refreshToken },
          { context: noSessionRedirect() },
        )
      : of(null);
    return request$.pipe(
      catchError(() => of(null)),
      map(() => undefined),
      finalize(() => {
        this.clearSession();
        void this.router.navigateByUrl('/');
      }),
    );
  }

  /** Lưu phiên sau khi đăng nhập (UC02) hoặc đổi mã OAuth (UC20). */
  setSession(res: LoginResponse): void {
    this.tokens.save(res);
    this.currentUser.set(res.user);
  }

  /** Cập nhật thông tin hiện trên header sau khi sửa hồ sơ, đổi avatar (UC12). */
  updateUser(patch: Partial<Pick<AuthUser, 'fullName' | 'avatar'>>): void {
    this.currentUser.update((user) => (user ? { ...user, ...patch } : user));
  }

  clearSession(): void {
    this.tokens.clear();
    this.currentUser.set(null);
  }

  /**
   * Hết phiên giữa chừng: xóa token, chuyển `/login?returnUrl=<trang hiện tại>&sessionError=<code>`.
   * Gọi từ refreshInterceptor, không gọi từ component.
   */
  endSession(reason: SessionEndReason, redirect = true): void {
    this.clearSession();
    if (!redirect) return;
    const current = this.router.url;
    if (current.startsWith('/login')) return;
    const queryParams: Params = { sessionError: reason };
    if (current !== '/') queryParams['returnUrl'] = current;
    void this.router.navigate(['/login'], { queryParams });
  }

  /**
   * Lấy access token mới. Gọi `POST /auth/refresh` **một lần** cho mọi request đang chờ.
   *
   * @param failedToken access token vừa bị từ chối. Nếu localStorage đã có token khác còn hạn
   *   (tab khác vừa refresh, hoặc refresh vừa xong) thì dùng luôn, không refresh nữa.
   */
  refreshAccessToken(failedToken?: string | null): Observable<string> {
    if (this.refreshing$) return this.refreshing$;

    const stored = this.tokens.accessToken;
    if (stored && stored !== failedToken && !isTokenExpired(stored))
      return of(stored);

    const refreshToken = this.tokens.refreshToken;
    if (!refreshToken) return throwError(() => NO_SESSION);

    this.refreshing$ = this.http
      .post<ApiResponse<TokenPair>>(
        '/auth/refresh',
        { refreshToken },
        { context: skipAuth() },
      )
      .pipe(
        unwrap(),
        tap((pair) => this.tokens.save(pair)),
        map((pair) => pair.accessToken),
        catchError((err: unknown) => {
          // Refresh token xoay vòng: tab khác refresh cùng lúc thì token của tab này đã bị thu hồi.
          // Tab kia đã ghi cặp token mới vào localStorage thì dùng cặp đó.
          const latestAccess = this.tokens.accessToken;
          const rotatedElsewhere = this.tokens.refreshToken !== refreshToken;
          if (
            rotatedElsewhere &&
            latestAccess &&
            !isTokenExpired(latestAccess)
          ) {
            return of(latestAccess);
          }
          return throwError(() => err);
        }),
        finalize(() => (this.refreshing$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshing$;
  }

  private fetchMe(): Observable<AuthUser> {
    return this.http
      .get<ApiResponse<AuthUser>>('/auth/me', { context: noSessionRedirect() })
      .pipe(
        unwrap(),
        tap((user) => this.currentUser.set(user)),
      );
  }

  /**
   * Đăng xuất ở tab khác thì tab này cũng đăng xuất và về `/` (UC04).
   * Đăng nhập ở tab khác thì tab này tải thông tin người dùng.
   * Sự kiện `storage` chỉ bắn ở các tab khác, không bắn ở tab vừa ghi.
   */
  private syncAcrossTabs(): void {
    const win = inject(DOCUMENT).defaultView;
    win?.addEventListener('storage', (event) => {
      if (event.key !== REFRESH_TOKEN_KEY && event.key !== null) return;
      const refreshToken = this.tokens.refreshToken;
      if (!refreshToken && this.currentUser()) {
        this.currentUser.set(null);
        void this.router.navigateByUrl('/');
      } else if (refreshToken && !this.currentUser()) {
        this.fetchMe().subscribe({ error: () => undefined });
      }
    });
  }
}
