import { PageKey } from '../models/page.model';

/** Một dòng của `GET /pages`, dùng cho link ở footer và menu (UC11) */
export class PublicPageLinkDto {
  key!: PageKey;
  /** Theo ngôn ngữ đang chọn, thiếu thì dùng ngôn ngữ mặc định */
  title!: string;
}

/** `GET /pages/:key` (UC11) */
export class PublicPageDto extends PublicPageLinkDto {
  /** HTML đã lọc XSS khi lưu */
  content!: string;
}
