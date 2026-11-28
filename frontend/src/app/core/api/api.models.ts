/**
 * Kiểu chung của response API (docs/phase-3-backend.md mục 3, docs/phase-4-frontend.md mục 3.1).
 * Component không đọc `success`, `message`: service dùng `unwrap()` / `unwrapPage()`.
 */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PageMeta;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface FieldError {
  /** Đường dẫn field theo DTO, có thể lồng nhau: `email`, `translation.title`, `names.vi` */
  field: string;
  message: string;
}

/** Mã lỗi trong `backend/src/common/errors.ts`, cộng `NETWORK_ERROR` của frontend. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'RESET_TOKEN_INVALID'
  | 'OAUTH_NO_EMAIL'
  | 'OAUTH_FAILED'
  | 'OAUTH_CODE_INVALID'
  | 'LANGUAGE_IN_USE'
  | 'CATEGORY_IN_USE'
  | 'LAST_SUPER_ADMIN'
  | 'ORIGINAL_TRANSLATION_REQUIRED'
  | 'NETWORK_ERROR';

/**
 * Lỗi mà mọi Observable gọi API ném ra (errorInterceptor đổi từ HttpErrorResponse).
 * `message` là câu tiếng Việt của backend: không hiện thẳng, tra key `error.<code>` (mục 3.3).
 */
export interface ApiError {
  status: number;
  code: ApiErrorCode;
  message: string;
  errors: FieldError[];
}
