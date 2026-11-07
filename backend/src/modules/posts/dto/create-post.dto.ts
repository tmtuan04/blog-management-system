import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateTranslationDto } from './create-translation.dto';
import { CategoryIdField, ThumbnailField, trim } from './post-fields';
import { TranslationFieldsDto } from './translation-fields.dto';

const ORIGINAL_MESSAGE = 'Thiếu nội dung bản gốc của bài viết.';

/** UC13 - Tạo bài, bản gốc và các bản dịch (nếu có) trong cùng một transaction */
export class CreatePostDto {
  /** Mã ngôn ngữ gốc, ví dụ `vi`. Phải đang hoạt động, không đổi được sau khi tạo */
  @trim
  @IsString({ message: 'Chọn ngôn ngữ gốc cho bài viết.' })
  @IsNotEmpty({ message: 'Chọn ngôn ngữ gốc cho bài viết.' })
  languageCode!: string;

  @CategoryIdField()
  categoryId!: number;

  /** Đường dẫn trả về từ POST /uploads/images */
  @ThumbnailField()
  thumbnail?: string;

  /** Bản gốc, ở ngôn ngữ `languageCode`. Lỗi ghi field dạng `translation.title` */
  @IsDefined({ message: ORIGINAL_MESSAGE })
  @IsObject({ message: ORIGINAL_MESSAGE })
  @ValidateNested()
  @Type(() => TranslationFieldsDto)
  translation!: TranslationFieldsDto;

  /**
   * Bản dịch soạn cùng lúc với bản gốc, không bắt buộc. Mỗi ngôn ngữ một bản,
   * khác ngôn ngữ gốc. Lỗi ghi field dạng `translations.0.title`
   */
  @IsOptional()
  @IsArray({ message: 'Danh sách bản dịch không hợp lệ.' })
  @ValidateNested({ each: true })
  @Type(() => CreateTranslationDto)
  translations?: CreateTranslationDto[];
}
