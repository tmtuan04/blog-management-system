import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ISO_639_1_CODES } from '../../../common/iso-639-1';

export const REQUIRED_MESSAGE = 'Vui lòng nhập trường này.';
const CODE_MESSAGE = '2 chữ cái thường theo ISO 639-1, ví dụ: fr, ja, ko.';
const NAME_MAX_MESSAGE = 'Tên hiển thị tối đa 50 ký tự.';
const ACTIVE_MESSAGE = 'Trạng thái hoạt động không hợp lệ.';

const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value,
);

/** POST /admin/languages (UC16) */
export class CreateLanguageDto {
  /** Mã ISO 639-1, 2 chữ cái thường. Không đổi được sau khi tạo */
  @trim
  @IsString({ message: CODE_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @IsIn(ISO_639_1_CODES, { message: CODE_MESSAGE })
  code!: string;

  /** Tên hiện trong bộ chọn ngôn ngữ, tối đa 50 ký tự */
  @trim
  @IsString({ message: REQUIRED_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MaxLength(50, { message: NAME_MAX_MESSAGE })
  name!: string;

  /** Không gửi thì ngôn ngữ mới ở trạng thái hoạt động */
  @IsOptional()
  @IsBoolean({ message: ACTIVE_MESSAGE })
  isActive?: boolean;
}

/** PATCH /admin/languages/:id (UC16). Không nhận `code` */
export class UpdateLanguageDto {
  /** Tên hiện trong bộ chọn ngôn ngữ, tối đa 50 ký tự */
  @trim
  @IsOptional()
  @IsString({ message: REQUIRED_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MaxLength(50, { message: NAME_MAX_MESSAGE })
  name?: string;

  /** Tắt ngôn ngữ mặc định thì báo lỗi 400 */
  @IsOptional()
  @IsBoolean({ message: ACTIVE_MESSAGE })
  isActive?: boolean;
}
