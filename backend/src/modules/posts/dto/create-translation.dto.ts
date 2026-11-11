import { IsNotEmpty, IsString } from 'class-validator';
import { trim } from './post-fields';
import { TranslationFieldsDto } from './translation-fields.dto';

const LANGUAGE_MESSAGE = 'Chọn ngôn ngữ của bản dịch.';

/** UC13 - Thêm bản dịch: `POST /admin/posts/:id/translations` */
export class CreateTranslationDto extends TranslationFieldsDto {
  /** Mã ngôn ngữ, ví dụ `en`. Phải đang hoạt động, khác ngôn ngữ gốc */
  @trim
  @IsString({ message: LANGUAGE_MESSAGE })
  @IsNotEmpty({ message: LANGUAGE_MESSAGE })
  languageCode!: string;
}
