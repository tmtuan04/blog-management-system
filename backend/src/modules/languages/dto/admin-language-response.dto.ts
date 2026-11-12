/** Một dòng của màn quản lý ngôn ngữ (UC16) */
export class AdminLanguageDto {
  id!: number;
  /** Mã ISO 639-1 */
  code!: string;
  name!: string;
  isDefault!: boolean;
  isActive!: boolean;
  /** Số bản dịch bài viết ở ngôn ngữ này. Lớn hơn 0 thì không xóa được */
  postTranslationCount!: number;
}
