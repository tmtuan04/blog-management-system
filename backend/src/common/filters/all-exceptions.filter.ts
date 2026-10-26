import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import {
  AppException,
  DEFAULT_CODES,
  DEFAULT_MESSAGES,
  ErrorCode,
  FieldError,
} from '../errors';

export interface ErrorBody {
  success: false;
  code: ErrorCode;
  message: string;
  errors?: FieldError[];
}

const snakeToCamel = (value: string) =>
  value.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * Bọc mọi lỗi theo format requirements 6.4 (thêm `code`, quyết định Q2).
 * Lỗi 500 chỉ trả "Lỗi hệ thống", chi tiết ghi log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toBody(exception);
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    res.status(status).json(body);
  }

  private toBody(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof AppException) {
      const status = exception.getStatus();
      return {
        status,
        body: {
          success: false,
          code: exception.code,
          message: exception.message,
          ...(exception.errors?.length ? { errors: exception.errors } : {}),
        },
      };
    }

    // Upload vượt dung lượng (multer LIMIT_FILE_SIZE)
    if (
      exception instanceof HttpException &&
      exception.getStatus() === Number(HttpStatus.PAYLOAD_TOO_LARGE)
    ) {
      return this.validation([{ field: 'file', message: 'Ảnh tối đa 2MB.' }]);
    }

    if (exception instanceof HttpException) {
      return this.simple(exception.getStatus());
    }

    if (exception instanceof UniqueConstraintError) {
      const errors = exception.errors.map((e) => ({
        field: snakeToCamel(e.path ?? ''),
        message: 'Giá trị đã tồn tại',
      }));
      return {
        status: HttpStatus.CONFLICT,
        body: {
          success: false,
          code: ErrorCode.CONFLICT,
          message: DEFAULT_MESSAGES[409],
          ...(errors.length ? { errors } : {}),
        },
      };
    }

    // Khóa ngoại RESTRICT. Service nên tự kiểm tra và ném mã lỗi theo ngữ cảnh
    if (exception instanceof ForeignKeyConstraintError) {
      return this.simple(HttpStatus.CONFLICT);
    }

    // Lỗi của body-parser (JSON sai cú pháp, body quá lớn)
    const httpLike = exception as { status?: number; type?: string };
    if (
      typeof httpLike?.type === 'string' &&
      typeof httpLike.status === 'number' &&
      httpLike.status >= 400 &&
      httpLike.status < 500
    ) {
      return this.simple(HttpStatus.BAD_REQUEST);
    }

    return this.simple(HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private simple(status: number): { status: number; body: ErrorBody } {
    // Chỉ dùng các mã HTTP ở requirements 6.4, mã khác quy về 400 hoặc 500
    let finalStatus = status;
    if (DEFAULT_MESSAGES[status] === undefined) {
      finalStatus =
        status >= 500
          ? HttpStatus.INTERNAL_SERVER_ERROR
          : HttpStatus.BAD_REQUEST;
    }
    return {
      status: finalStatus,
      body: {
        success: false,
        code: DEFAULT_CODES[finalStatus],
        message: DEFAULT_MESSAGES[finalStatus],
      },
    };
  }

  private validation(errors: FieldError[]): {
    status: number;
    body: ErrorBody;
  } {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        success: false,
        code: ErrorCode.VALIDATION_ERROR,
        message: DEFAULT_MESSAGES[400],
        errors,
      },
    };
  }
}
