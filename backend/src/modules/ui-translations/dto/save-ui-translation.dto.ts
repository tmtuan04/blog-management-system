import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const REQUIRED_MESSAGE = 'Vui lòng nhập trường này.';
export const VALUE_MAX_LENGTH = 255;
export const VALUE_MAX_MESSAGE = `Giá trị tối đa ${VALUE_MAX_LENGTH} ký tự.`;
const KEY_MESSAGE =
  'Chữ thường, số, dấu chấm và gạch dưới, dạng nhóm.tên. Ví dụ: menu.blog, post.read_more.';

const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value,
);

/** POST /admin/ui-translations (UC17) */
export class CreateUiTranslationDto {
  /** Dạng `nhom.ten`, ví dụ `menu.blog`. Tối đa 100 ký tự */
  @trim
  @IsString({ message: KEY_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MaxLength(100, { message: 'Key tối đa 100 ký tự.' })
  @Matches(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/, { message: KEY_MESSAGE })
  key!: string;

  /**
   * Giá trị theo mã ngôn ngữ đang hoạt động. Ngôn ngữ mặc định bắt buộc; ngôn ngữ
   * khác để trống thì giao diện dùng giá trị mặc định.
   */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { vi: 'Blog', en: 'Blog' },
  })
  @IsObject({ message: 'Giá trị phải là object theo mã ngôn ngữ.' })
  values!: Record<string, string | null>;
}

/** PUT /admin/ui-translations/:key/:code (UC17) */
export class UpdateUiTranslationValueDto {
  /** Rỗng ở ngôn ngữ không mặc định thì xóa giá trị của ô đó */
  @trim
  @IsString({ message: 'Giá trị phải là chuỗi.' })
  @MaxLength(VALUE_MAX_LENGTH, { message: VALUE_MAX_MESSAGE })
  value!: string;
}
