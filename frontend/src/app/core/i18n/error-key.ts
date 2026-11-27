import { ApiErrorCode } from '../api/api.models';

/**
 * Key dịch của một mã lỗi: `CATEGORY_IN_USE` → `error.category_in_use` (docs/phase-4-frontend.md mục 3.3).
 * Frontend không hiện `message` tiếng Việt của backend.
 */
export function errorKey(code: ApiErrorCode): string {
  return `error.${code.toLowerCase()}`;
}
