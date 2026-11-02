import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

/**
 * Ràng buộc dùng chung cho các DTO bài viết (UC13). Câu chữ lấy theo
 * `invalid-feedback` của `admin/post-create.html`, `admin/post-edit.html`.
 */
export const CATEGORY_MESSAGE = 'Chọn danh mục cho bài viết.';
export const THUMBNAIL_MESSAGE =
  'Ảnh bìa không hợp lệ. Vui lòng tải ảnh lên lại.';

/** Đường dẫn trả về từ POST /uploads/images (phase 3 doc mục 3.6) */
export const THUMBNAIL_PATTERN =
  /^uploads\/images\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value,
);

/** Tham số query rỗng (`?q=`) coi như không lọc */
export const optionalQuery = Transform(({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
});

export const CategoryIdField = () =>
  applyDecorators(
    IsInt({ message: CATEGORY_MESSAGE }),
    Min(1, { message: CATEGORY_MESSAGE }),
  );

/** Không bắt buộc. Service kiểm tra thêm file phải tồn tại */
export const ThumbnailField = () =>
  applyDecorators(
    IsOptional(),
    IsString({ message: THUMBNAIL_MESSAGE }),
    Matches(THUMBNAIL_PATTERN, { message: THUMBNAIL_MESSAGE }),
  );
