import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, ApiErrorCode, FieldError } from './api.models';

interface ErrorBody {
  code: ApiErrorCode;
  message: string;
  errors?: FieldError[];
}

function isErrorBody(body: unknown): body is ErrorBody {
  if (typeof body !== 'object' || body === null) return false;
  const { code, message } = body as Record<string, unknown>;
  return typeof code === 'string' && typeof message === 'string';
}

/**
 * Đổi HttpErrorResponse thành ApiError. Lỗi mạng, hoặc response không có body lỗi
 * theo format của backend (backend tắt, proxy trả 502/504), thành `status: 0`, `NETWORK_ERROR`.
 */
export function toApiError(err: HttpErrorResponse): ApiError {
  const body: unknown = err.error;
  if (err.status === 0 || !isErrorBody(body)) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: err.message,
      errors: [],
    };
  }
  return {
    status: err.status,
    code: body.code,
    message: body.message,
    errors: Array.isArray(body.errors) ? body.errors : [],
  };
}

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false;
  const { status, code, errors } = value as Record<string, unknown>;
  return (
    typeof status === 'number' &&
    typeof code === 'string' &&
    Array.isArray(errors)
  );
}
