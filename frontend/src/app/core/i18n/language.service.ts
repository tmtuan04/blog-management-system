import { Injectable, signal } from '@angular/core';
import { FALLBACK_LANG } from './i18n-files';

/**
 * Ngôn ngữ đang chọn (UC09, docs/phase-4-frontend.md mục 3.4).
 *
 * Bước 3 của A1 mới có `current` để languageInterceptor gửi `Accept-Language`.
 * Bước 5 thêm `languages`, `init()`, `use(code)`, `reload()`.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly currentCode = signal<string>(FALLBACK_LANG);

  /** Mã ngôn ngữ đang chọn, ví dụ `vi`. */
  readonly current = this.currentCode.asReadonly();
}
