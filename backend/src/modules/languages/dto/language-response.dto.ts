/** Ngôn ngữ trong bộ chọn ngôn ngữ (UC09) */
export class LanguageResponseDto {
  /** Mã ISO 639-1 */
  code!: string;
  name!: string;
  isDefault!: boolean;
}
