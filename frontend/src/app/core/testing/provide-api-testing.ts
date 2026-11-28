import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { Routes, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { API_INTERCEPTORS } from '../interceptors';

/**
 * Chỉ dùng trong *.spec.ts: provider để test service gọi API qua đủ interceptor thật
 * (prefix `/api/v1`, `Accept-Language`, token, refresh, đổi lỗi thành ApiError).
 * Request bắt bằng `TestBed.inject(HttpTestingController)`.
 *
 * @example TestBed.configureTestingModule({ providers: [provideApiTesting()] });
 */
export function provideApiTesting(
  routes: Routes = [],
): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter(routes),
    provideHttpClient(withInterceptors(API_INTERCEPTORS)),
    provideHttpClientTesting(),
    provideTranslateService({ fallbackLang: 'vi' }),
  ];
}

/** Response thành công theo format của backend */
export function apiOk<T>(data: T, meta?: unknown) {
  return meta === undefined
    ? { success: true, message: 'OK', data }
    : { success: true, message: 'OK', data, meta };
}

/** Body lỗi theo format của backend, dùng với `req.flush(apiFail(...), { status, statusText })` */
export function apiFail(
  code: string,
  message = code,
  errors?: { field: string; message: string }[],
) {
  return errors
    ? { success: false, code, message, errors }
    : { success: false, code, message };
}
