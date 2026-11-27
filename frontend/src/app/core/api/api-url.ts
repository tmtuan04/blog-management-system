import { environment } from '../../../environments/environment';

/** File tĩnh do frontend tự phục vụ, gọi bằng HttpClient nhưng không phải API. */
const STATIC_PREFIXES = ['/i18n/'];

/** Request đã mang prefix `/api/v1`: interceptor thêm header, đổi lỗi chỉ cho các request này. */
export function isApiRequest(url: string): boolean {
  return (
    url === environment.apiBase || url.startsWith(`${environment.apiBase}/`)
  );
}

/**
 * Đường dẫn service viết dạng `/posts`, `/admin/categories/3` thì cần thêm `/api/v1`.
 * Bỏ qua URL tuyệt đối, URL đã có prefix và file tĩnh (`/i18n/vi.json`).
 */
export function needsApiPrefix(url: string): boolean {
  if (!url.startsWith('/') || url.startsWith('//')) return false;
  if (isApiRequest(url)) return false;
  return !STATIC_PREFIXES.some((prefix) => url.startsWith(prefix));
}
