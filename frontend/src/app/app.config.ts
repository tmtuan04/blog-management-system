import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { FALLBACK_LANG } from './core/i18n/i18n-files';
import { LanguageService } from './core/i18n/language.service';
import { registerAppLocales } from './core/i18n/locale';
import { TranslatedTitleStrategy } from './core/i18n/translated-title.strategy';
import { API_INTERCEPTORS } from './core/interceptors';

/**
 * Chạy trước khi router chạy và trang hiện ra:
 * 1. Chọn ngôn ngữ và tải file dịch, để không nháy key dịch; request sau đó gửi đúng `Accept-Language`.
 * 2. Khôi phục phiên (`GET /auth/me`), để guard và header biết role ngay (mục 3.2).
 */
async function initApp(): Promise<void> {
  const language = inject(LanguageService);
  const auth = inject(AuthService);
  registerAppLocales();
  await language.init();
  await auth.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    provideHttpClient(withFetch(), withInterceptors(API_INTERCEPTORS)),
    provideTranslateService({
      fallbackLang: FALLBACK_LANG,
      // File dịch là file tĩnh: tải thẳng qua HttpBackend, không đi qua interceptor của API
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
        useHttpBackend: true,
      }),
    }),
    provideAppInitializer(initApp),
  ],
};
