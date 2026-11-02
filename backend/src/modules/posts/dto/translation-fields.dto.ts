import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import {
  POST_STATUSES,
  type PostStatus,
} from '../models/post-translation.model';
import { trim } from './post-fields';

/** Các trường theo từng ngôn ngữ của bài (UC13). Dùng cho bản gốc và bản dịch */
export class TranslationFieldsDto {
  /** 5-255 ký tự */
  @trim
  @IsString({ message: 'Tiêu đề cần từ 5 đến 255 ký tự.' })
  @Length(5, 255, { message: 'Tiêu đề cần từ 5 đến 255 ký tự.' })
  title!: string;

  /** Tối đa 500 ký tự */
  @IsOptional()
  @trim
  @IsString({ message: 'Tóm tắt tối đa 500 ký tự.' })
  @MaxLength(500, { message: 'Tóm tắt tối đa 500 ký tự.' })
  excerpt?: string;

  /** HTML từ editor, service lọc bằng sanitizeRichText */
  @IsString({ message: 'Nhập nội dung bài viết.' })
  content!: string;

  @ApiProperty({ enum: POST_STATUSES })
  @IsIn(POST_STATUSES, { message: 'Trạng thái không hợp lệ.' })
  status!: PostStatus;
}
