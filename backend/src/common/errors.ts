import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Mã lỗi trả trong trường `code` của response lỗi (quyết định Q2).
 * Phase 4 map `code` sang key UI translation `error.*` để hiện theo ngôn ngữ đang chọn.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
  OAUTH_NO_EMAIL: 'OAUTH_NO_EMAIL',
  // Nghiệp vụ
  LANGUAGE_IN_USE: 'LANGUAGE_IN_USE',
  CATEGORY_IN_USE: 'CATEGORY_IN_USE',
  LAST_SUPER_ADMIN: 'LAST_SUPER_ADMIN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface FieldError {
  field: string;
  message: string;
}

/** Message mặc định theo mã HTTP, dùng khi lỗi không tự đặt message */
export const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu không hợp lệ',
  401: 'Vui lòng đăng nhập',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy dữ liệu',
  409: 'Dữ liệu bị trùng',
  429: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau',
  500: 'Lỗi hệ thống',
};

export const DEFAULT_CODES: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.TOO_MANY_REQUESTS,
  500: ErrorCode.INTERNAL_ERROR,
};

/**
 * Lỗi nghiệp vụ. Service ném lỗi này, AllExceptionsFilter bọc theo format 6.4.
 *
 * @example throw new AppException(409, ErrorCode.CATEGORY_IN_USE, 'Danh mục đang có bài viết')
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message?: string,
    readonly errors?: FieldError[],
  ) {
    super(message ?? DEFAULT_MESSAGES[status] ?? 'Lỗi', status);
  }

  static validation(errors: FieldError[], message?: string): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
      message,
      errors,
    );
  }

  static notFound(message?: string): AppException {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, message);
  }

  static forbidden(message?: string): AppException {
    return new AppException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, message);
  }
}
