import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export const PAGE_TITLE_MIN = 2;
export const PAGE_TITLE_MAX = 255;

/**
 * Chỉ kiểm tra hình dạng dữ liệu. Tiêu đề và nội dung từng ngôn ngữ phụ thuộc ngôn ngữ
 * mặc định nên do `AdminPagesService` kiểm tra, lỗi ghi field `translations.<code>.title`.
 */
export class SavePageTranslationDto {
  /** Mã ngôn ngữ (vi, en...). Mỗi mã chỉ xuất hiện một lần */
  @IsString({ message: 'Mã ngôn ngữ không hợp lệ.' })
  @IsNotEmpty({ message: 'Mã ngôn ngữ không hợp lệ.' })
  code!: string;

  /** Ngôn ngữ mặc định: 2-255 ký tự. Ngôn ngữ khác: điền cùng nội dung hoặc để trống cả hai */
  @IsOptional()
  @IsString({ message: 'Tiêu đề không hợp lệ.' })
  title?: string;

  /** HTML từ rich text editor, backend lọc thẻ và thuộc tính nguy hiểm */
  @IsOptional()
  @IsString({ message: 'Nội dung không hợp lệ.' })
  content?: string;
}

/** PUT /admin/pages/:key (UC18) */
export class SavePageDto {
  /** Bật hoặc tắt trang, áp dụng cho mọi ngôn ngữ */
  @IsBoolean({ message: 'Trạng thái hiển thị không hợp lệ.' })
  isVisible!: boolean;

  /** Một phần tử cho mỗi tab ngôn ngữ. Phải có phần tử của ngôn ngữ mặc định */
  @IsArray({ message: 'Danh sách bản dịch không hợp lệ.' })
  @ArrayMaxSize(50, { message: 'Danh sách bản dịch không hợp lệ.' })
  @ValidateNested({ each: true })
  @Type(() => SavePageTranslationDto)
  translations!: SavePageTranslationDto[];
}
