import { ApiProperty } from '@nestjs/swagger';
import {
  POST_STATUSES,
  type PostStatus,
} from '../models/post-translation.model';

export class AdminPostCategoryDto {
  id!: number;
  /** Tên theo ngôn ngữ mặc định */
  name!: string;
}

/** Badge ngôn ngữ + trạng thái trên dòng danh sách */
export class AdminPostTranslationStatusDto {
  code!: string;

  @ApiProperty({ enum: POST_STATUSES })
  status!: PostStatus;
}

/** Một dòng của GET /admin/posts */
export class AdminPostListItemDto {
  id!: number;
  /** Tiêu đề bản gốc */
  title!: string;
  /** Mã ngôn ngữ gốc */
  languageCode!: string;
  category!: AdminPostCategoryDto;
  /** Đường dẫn trong uploads/, null nếu không có ảnh */
  thumbnail!: string | null;
  translations!: AdminPostTranslationStatusDto[];
  /** Lớn nhất giữa bài và các bản dịch */
  updatedAt!: Date;
}

/** Một bản dịch trong GET /admin/posts/:id */
export class AdminPostTranslationDto {
  code!: string;
  /** Bản ở ngôn ngữ gốc, không xóa riêng được */
  isOriginal!: boolean;
  title!: string;
  slug!: string;
  excerpt!: string | null;
  /** HTML đã lọc XSS */
  content!: string;

  @ApiProperty({ enum: POST_STATUSES })
  status!: PostStatus;

  viewCount!: number;
  /** Lần đầu chuyển sang published, null nếu chưa đăng lần nào */
  publishedAt!: Date | null;
  updatedAt!: Date;
}

/** GET /admin/posts/:id, dùng cho màn sửa bài */
export class AdminPostDetailDto {
  id!: number;
  /** Mã ngôn ngữ gốc */
  languageCode!: string;
  category!: AdminPostCategoryDto;
  thumbnail!: string | null;
  /** Mọi bản dịch, kể cả ở ngôn ngữ đã tắt. Bản gốc đứng đầu */
  translations!: AdminPostTranslationDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
