import { HttpInterceptorFn } from '@angular/common/http';
import { apiUrlInterceptor } from './api-url.interceptor';
import { errorInterceptor } from './error.interceptor';
import { languageInterceptor } from './language.interceptor';

/**
 * Thứ tự có ý nghĩa: request đi từ trên xuống, response và lỗi đi từ dưới lên.
 *
 * 1. apiUrl: thêm `/api/v1` trước, để các interceptor sau nhận ra request API.
 * 2. language: `Accept-Language`.
 * 3. auth (A1 bước 4): `Authorization: Bearer`.
 * 4. refresh (A1 bước 4): bắt `TOKEN_EXPIRED`, refresh rồi gửi lại. Đứng trên error để đọc ApiError.
 * 5. error: đứng cuối nên nhận lỗi đầu tiên, đổi HttpErrorResponse thành ApiError.
 */
export const API_INTERCEPTORS: HttpInterceptorFn[] = [
  apiUrlInterceptor,
  languageInterceptor,
  errorInterceptor,
];
