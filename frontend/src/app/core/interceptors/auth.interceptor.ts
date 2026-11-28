import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, switchMap } from 'rxjs';
import { isApiRequest } from '../api/api-url';
import { SKIP_AUTH } from '../auth/auth-context';
import { AuthService } from '../auth/auth.service';
import { isTokenExpired } from '../auth/jwt';
import { TokenStorage } from '../auth/token-storage';

export function withBearer<T>(
  req: HttpRequest<T>,
  token: string,
): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Gắn `Authorization: Bearer <accessToken>` cho mọi request API (kể cả route public:
 * `optionalAuth` như `/posts/:slug` cần token để biết quyền xóa bình luận).
 *
 * Access token đã hết hạn thì refresh **trước** khi gửi: route `optionalAuth` nhận token hết hạn
 * không trả 401 mà coi như khách, nên không thể chờ 401 mới refresh.
 * Refresh lỗi thì xóa phiên và gửi như khách; route cần đăng nhập sẽ trả 401 để refreshInterceptor chuyển `/login`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url) || req.context.get(SKIP_AUTH)) return next(req);

  const tokens = inject(TokenStorage);
  const access = tokens.accessToken;
  if (!access) return next(req);
  if (!isTokenExpired(access) || !tokens.refreshToken)
    return next(withBearer(req, access));

  const auth = inject(AuthService);
  return auth.refreshAccessToken(access).pipe(
    catchError(() => {
      auth.clearSession();
      return of(null);
    }),
    switchMap((token) => next(token ? withBearer(req, token) : req)),
  );
};
