import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';

export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 150;
export const NAMES_MESSAGE = 'Tên danh mục không hợp lệ.';

/**
 * POST /admin/categories, PATCH /admin/categories/:id (UC15).
 * Khóa của `names` là mã ngôn ngữ nên không kiểm tra từng khóa bằng decorator được:
 * service kiểm tra mã ngôn ngữ, tên ngôn ngữ mặc định và độ dài, lỗi ghi field `names.<code>`.
 */
export class SaveCategoryDto {
  /** Tên theo mã ngôn ngữ. Tên ngôn ngữ mặc định bắt buộc (2-150 ký tự); tên rỗng thì không có bản dịch ở ngôn ngữ đó */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { vi: 'Du lịch', en: 'Travel' },
  })
  @IsObject({ message: NAMES_MESSAGE })
  @IsNotEmptyObject({}, { message: NAMES_MESSAGE })
  names!: Record<string, string>;
}
