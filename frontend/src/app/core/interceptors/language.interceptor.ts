import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { isApiRequest } from '../api/api-url';
import { LanguageService } from '../i18n/language.service';

/** Gửi `Accept-Language: <ngôn ngữ đang chọn>` cho mọi request API (UC09). */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url) || req.headers.has('Accept-Language'))
    return next(req);
  const lang = inject(LanguageService).current();
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
