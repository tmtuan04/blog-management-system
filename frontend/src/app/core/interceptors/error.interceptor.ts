import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { toApiError } from '../api/api-error';
import { isApiRequest } from '../api/api-url';
import { SKIP_ERROR_TOAST } from '../api/http-context';
import { errorKey } from '../i18n/error-key';
import { ToastService } from '../../shared/components/toast/toast.service';

/**
 * Đổi mọi HttpErrorResponse của request API thành ApiError (docs/phase-4-frontend.md mục 3.3).
 * Đứng cuối danh sách interceptor nên nhận lỗi đầu tiên; refreshInterceptor (bước 4) đọc ApiError.code.
 *
 * Lỗi mạng và 5xx: hiện toast tại đây, component không phải tự hiện. Lỗi 4xx để component xử lý.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || !isApiRequest(req.url)) {
        return throwError(() => err);
      }
      const apiError = toApiError(err);
      const isServerSide = apiError.status === 0 || apiError.status >= 500;
      if (isServerSide && !req.context.get(SKIP_ERROR_TOAST)) {
        toast.error(errorKey(apiError.code));
      }
      return throwError(() => apiError);
    }),
  );
};
