import { IsOptional } from 'class-validator';
import { CategoryIdField, ThumbnailField } from './post-fields';

/** UC13 - Sửa phần dùng chung. Không nhận `languageCode` (ngôn ngữ gốc không đổi được) */
export class UpdatePostDto {
  @IsOptional()
  @CategoryIdField()
  categoryId?: number;

  /**
   * Không gửi: giữ ảnh cũ. `null`: bỏ ảnh. Đường dẫn mới: đổi ảnh.
   * Bỏ hoặc đổi ảnh thì service xóa file cũ.
   */
  @ThumbnailField()
  thumbnail?: string | null;
}
