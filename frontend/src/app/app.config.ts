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
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { API_INTERCEPTORS } from './core/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors(API_INTERCEPTORS)),
    // Khôi phục phiên trước khi router chạy, để guard và header biết role ngay (mục 3.2).
    // Bước 5 thêm nạp danh sách ngôn ngữ chạy trước bước này.
    provideAppInitializer(() => inject(AuthService).init()),
  ],
};
