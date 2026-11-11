import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CategoryIdField, ThumbnailField, trim } from './post-fields';
import { TranslationFieldsDto } from './translation-fields.dto';

const ORIGINAL_MESSAGE = 'Thiếu nội dung bản gốc của bài viết.';

/**
 * UC13 - Tạo bài và bản gốc. Bản dịch thêm sau bằng
 * `POST /admin/posts/:id/translations`.
 */
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
}
