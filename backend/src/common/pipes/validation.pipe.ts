import { ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException, FieldError } from '../errors';

const WHITELIST_MESSAGE = 'Trường này không được phép';

/**
 * Đổi cây lỗi của class-validator thành danh sách `{ field, message }`.
 * Field lồng nhau viết dạng `translations.0.title`. Mỗi field lấy lỗi đầu tiên.
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const result: FieldError[] = [];
    if (error.constraints) {
      const [key, message] = Object.entries(error.constraints)[0];
      result.push({
        field,
        message: key === 'whitelistValidation' ? WHITELIST_MESSAGE : message,
      });
    }
    if (error.children?.length) {
      result.push(...flattenValidationErrors(error.children, field));
    }
    return result;
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    // Lỗi của từng field chỉ lấy ràng buộc đầu tiên bị vi phạm
    stopAtFirstError: true,
    exceptionFactory: (errors) =>
      AppException.validation(flattenValidationErrors(errors)),
  });
}
