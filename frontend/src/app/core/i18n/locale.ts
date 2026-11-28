import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeVi from '@angular/common/locales/vi';
import { I18nFile } from './i18n-files';

/** Dữ liệu locale cho mọi file dịch chữ tĩnh (tên tháng, định dạng số). Gọi một lần lúc khởi động. */
export function registerAppLocales(): void {
  registerLocaleData(localeVi, 'vi');
  registerLocaleData(localeEn, 'en');
}

export type DateStyle = 'date' | 'datetime';

/**
 * Định dạng ngày giờ theo ngôn ngữ chữ tĩnh. `vi` theo phase 2 (`12/10/2026`, `12/10/2026 21:15`);
 * `en` dùng tên tháng để không nhầm ngày/tháng (`Oct 12, 2026`, `Oct 12, 2026, 21:15`).
 */
export const DATE_FORMATS: Record<I18nFile, Record<DateStyle, string>> = {
  vi: { date: 'dd/MM/yyyy', datetime: 'dd/MM/yyyy HH:mm' },
  en: { date: 'MMM d, y', datetime: 'MMM d, y, HH:mm' },
};
