import {
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { isApiError } from '../api/api-error';
import { isApiRequest } from '../api/api-url';
import { SESSION_REDIRECT, SKIP_AUTH } from '../auth/auth-context';
import { AuthService } from '../auth/auth.service';
import { withBearer } from './auth.interceptor';

/**
 * Xử lý lỗi phiên của request API (docs/phase-4-frontend.md mục 3.2, 3.3). Đứng trên errorInterceptor nên nhận ApiError.
 *
 * - 401 `TOKEN_EXPIRED`: refresh (một lần cho mọi request đang chờ), gửi lại request với token mới.
 *   Refresh lỗi thì hết phiên, chuyển `/login?returnUrl=...&sessionError=TOKEN_EXPIRED`.
 * - 401 khác, hoặc request gửi lại vẫn 401: hết phiên (`UNAUTHORIZED`).
 * - 403 `ACCOUNT_LOCKED` (bị khóa khi đang dùng): hết phiên (`ACCOUNT_LOCKED`).
 *
 * Bỏ qua request `skipAuth()` (đăng nhập, refresh...): lỗi của chúng là lỗi của form.
 * Lỗi vẫn được ném tiếp cho component sau khi xử lý.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url) || req.context.get(SKIP_AUTH)) return next(req);

  const auth = inject(AuthService);
  const redirect = req.context.get(SESSION_REDIRECT);

  const send = (
    request: HttpRequest<unknown>,
    retried: boolean,
  ): Observable<HttpEvent<unknown>> =>
    next(request).pipe(
      catchError((err: unknown) => {
        if (!isApiError(err)) return throwError(() => err);

        if (err.status === 403 && err.code === 'ACCOUNT_LOCKED') {
          auth.endSession('ACCOUNT_LOCKED', redirect);
          return throwError(() => err);
        }
        if (err.status !== 401) return throwError(() => err);

        if (err.code !== 'TOKEN_EXPIRED' || retried) {
          auth.endSession('UNAUTHORIZED', redirect);
          return throwError(() => err);
        }

        const failedToken =
          request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null;
        return auth.refreshAccessToken(failedToken).pipe(
          catchError((refreshErr: unknown) => {
            const locked =
              isApiError(refreshErr) && refreshErr.code === 'ACCOUNT_LOCKED';
            auth.endSession(
              locked ? 'ACCOUNT_LOCKED' : 'TOKEN_EXPIRED',
              redirect,
            );
            return throwError(() => err);
          }),
          switchMap((token) => send(withBearer(request, token), true)),
        );
      }),
    );

  return send(req, false);
};
