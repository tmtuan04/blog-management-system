import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Request không cần token (đăng nhập, đăng ký, refresh, quên/đặt lại mật khẩu, OAuth exchange):
 * authInterceptor không gắn `Authorization`, refreshInterceptor không xử lý 401/403 của nó
 * (401 `INVALID_CREDENTIALS` của màn đăng nhập là lỗi của form, không phải hết phiên).
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * Hết phiên (refresh lỗi, 401, 403 `ACCOUNT_LOCKED`) thì chuyển `/login`. Đặt `false` cho request
 * mà hết phiên chỉ cần xóa token, không chuyển trang: `GET /auth/me` lúc khởi động, `POST /auth/logout`.
 */
export const SESSION_REDIRECT = new HttpContextToken<boolean>(() => true);

export function skipAuth(context = new HttpContext()): HttpContext {
  return context.set(SKIP_AUTH, true);
}

export function noSessionRedirect(context = new HttpContext()): HttpContext {
  return context.set(SESSION_REDIRECT, false);
}
