import { PageKey } from '../models/page.model';

/** Một dòng của màn danh sách trang tĩnh (UC18) */
export class AdminPageListItemDto {
  key!: PageKey;
  /** Tiêu đề theo ngôn ngữ mặc định, chưa có thì trả `key` */
  title!: string;
  /** Mã các ngôn ngữ đang hoạt động đã có nội dung, ngôn ngữ mặc định đứng đầu */
  languages!: string[];
  isVisible!: boolean;
  /** Lần lưu gần nhất */
  updatedAt!: Date;
}

/** Một tab ngôn ngữ ở màn sửa trang. Chưa có nội dung thì `title` và `content` là chuỗi rỗng */
export class AdminPageTranslationDto {
  code!: string;
  name!: string;
  isDefault!: boolean;
  title!: string;
  content!: string;
}

/** `GET /admin/pages/:key` và kết quả của `PUT` (UC18) */
export class AdminPageDto {
  key!: PageKey;
  isVisible!: boolean;
  updatedAt!: Date;
  /** Mỗi ngôn ngữ đang hoạt động một phần tử, ngôn ngữ mặc định đứng đầu */
  translations!: AdminPageTranslationDto[];
}
