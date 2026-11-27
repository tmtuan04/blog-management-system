import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { needsApiPrefix } from '../api/api-url';

/** Thêm `/api/v1` trước đường dẫn tương đối: service chỉ viết `this.http.get('/posts')`. */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!needsApiPrefix(req.url)) return next(req);
  return next(req.clone({ url: `${environment.apiBase}${req.url}` }));
};
