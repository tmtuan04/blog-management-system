import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Tắt toast lỗi mạng / lỗi 5xx của errorInterceptor cho một request,
 * khi component tự hiện lỗi đó (ví dụ dòng lỗi dưới editor khi upload ảnh).
 *
 * @example this.http.post(url, body, { context: skipErrorToast() })
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export function skipErrorToast(context = new HttpContext()): HttpContext {
  return context.set(SKIP_ERROR_TOAST, true);
}
