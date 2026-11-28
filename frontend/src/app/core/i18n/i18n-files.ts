/**
 * File dịch chữ tĩnh có trong `public/i18n/` (docs/phase-4-frontend.md mục 3.4, requirements D5).
 * Ngôn ngữ nội dung (`GET /languages`) có thể nhiều hơn danh sách này: admin thêm ngôn ngữ mới (UC16)
 * thì nội dung có ngay, còn chữ tĩnh dùng file dự phòng cho đến khi có file dịch mới và deploy lại.
 */
export const I18N_FILES = ['vi', 'en'] as const;

export type I18nFile = (typeof I18N_FILES)[number];

/** Dự phòng cuối cùng: ngôn ngữ mặc định chưa có file dịch, hoặc chưa tải được danh sách ngôn ngữ. */
export const FALLBACK_LANG: I18nFile = 'vi';

export function hasStaticFile(code: string): code is I18nFile {
  return (I18N_FILES as readonly string[]).includes(code);
}

/** File dự phòng khi thiếu key hoặc chưa có file: ngôn ngữ mặc định nếu có file, không thì `vi`. */
export function fallbackFileFor(defaultCode: string | null): I18nFile {
  return defaultCode && hasStaticFile(defaultCode)
    ? defaultCode
    : FALLBACK_LANG;
}
