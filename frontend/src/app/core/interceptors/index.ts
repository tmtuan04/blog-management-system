import { HttpInterceptorFn } from '@angular/common/http';
import { apiUrlInterceptor } from './api-url.interceptor';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { languageInterceptor } from './language.interceptor';
import { refreshInterceptor } from './refresh.interceptor';

/**
 * Thứ tự có ý nghĩa: request đi từ trên xuống, response và lỗi đi từ dưới lên.
 *
 * 1. apiUrl: thêm `/api/v1` trước, để các interceptor sau nhận ra request API.
 * 2. language: `Accept-Language`.
 * 3. auth: `Authorization: Bearer`, refresh trước nếu access token đã hết hạn.
 * 4. refresh: bắt 401 `TOKEN_EXPIRED` thì refresh rồi gửi lại; 401 khác, 403 `ACCOUNT_LOCKED` thì hết phiên.
 *    Đứng trên error để đọc ApiError. Request gửi lại đi qua error nhưng không qua auth (đã tự gắn token).
 * 5. error: đứng cuối nên nhận lỗi đầu tiên, đổi HttpErrorResponse thành ApiError.
 */
export const API_INTERCEPTORS: HttpInterceptorFn[] = [
  apiUrlInterceptor,
  languageInterceptor,
  authInterceptor,
  refreshInterceptor,
  errorInterceptor,
];
