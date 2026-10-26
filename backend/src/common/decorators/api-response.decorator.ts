import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorCode } from '../errors';

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;
  @ApiProperty({ example: 10 })
  limit!: number;
  @ApiProperty({ example: 125 })
  total!: number;
  @ApiProperty({ example: 13 })
  totalPages!: number;
}

class FieldErrorDto {
  @ApiProperty({ example: 'email' })
  field!: string;
  @ApiProperty({ example: 'Email này đã được đăng ký.' })
  message!: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;
  @ApiProperty({ enum: Object.values(ErrorCode), example: 'VALIDATION_ERROR' })
  code!: string;
  @ApiProperty({ example: 'Dữ liệu không hợp lệ' })
  message!: string;
  @ApiProperty({ type: [FieldErrorDto], required: false })
  errors?: FieldErrorDto[];
}

const envelope = (message: string, data: Record<string, unknown>) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data,
  },
});

/** Response thành công `{ success, message, data }` với `data` là `model` */
export function ApiDataResponse(
  model: Type<unknown> | null,
  options: { status?: number; isArray?: boolean; description?: string } = {},
) {
  const { status = 200, isArray = false, description } = options;
  let data: Record<string, unknown> = { type: 'object', nullable: true };
  if (model) {
    const ref = { $ref: getSchemaPath(model) };
    data = isArray ? { type: 'array', items: ref } : ref;
  }
  return applyDecorators(
    ...(model ? [ApiExtraModels(model)] : []),
    ApiResponse({
      status,
      description,
      schema: envelope('Thành công', data),
    }),
  );
}

/** Response phân trang `{ success, message, data: [], meta }` (phase 3 doc mục 3.9) */
export function ApiPaginatedResponse(model: Type<unknown>) {
  const schema = envelope('Thành công', {
    type: 'array',
    items: { $ref: getSchemaPath(model) },
  });
  (schema.properties as Record<string, unknown>).meta = {
    $ref: getSchemaPath(PaginationMetaDto),
  };
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiResponse({ status: 200, schema }),
  );
}

/** Mô tả các mã lỗi route có thể trả, ví dụ `@ApiErrorResponses(400, 401, 409)` */
export function ApiErrorResponses(...statuses: number[]) {
  const descriptions: Record<number, string> = {
    400: 'Dữ liệu không hợp lệ (VALIDATION_ERROR)',
    401: 'Chưa đăng nhập hoặc token hết hạn (UNAUTHORIZED, TOKEN_EXPIRED)',
    403: 'Không có quyền (FORBIDDEN)',
    404: 'Không tìm thấy (NOT_FOUND)',
    409: 'Trùng dữ liệu (CONFLICT)',
    429: 'Vượt rate limit (TOO_MANY_REQUESTS)',
  };
  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: descriptions[status],
        type: ErrorResponseDto,
      }),
    ),
  );
}
