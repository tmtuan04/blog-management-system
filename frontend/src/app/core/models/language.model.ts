/** Ngôn ngữ đang hoạt động, theo response của `GET /languages` (UC09). */
export interface Language {
  /** ISO 639-1, ví dụ `vi`, `en` */
  code: string;
  /** Tên tự gọi của ngôn ngữ, ví dụ `Tiếng Việt`, `English` */
  name: string;
  isDefault: boolean;
}
