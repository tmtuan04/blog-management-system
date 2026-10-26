import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'public';

export interface PublicOptions {
  /**
   * Có token hợp lệ thì vẫn gắn req.user, không có hoặc token lỗi thì coi là khách.
   * Dùng cho route public cần biết ai đang xem (ví dụ quyền xóa bình luận).
   */
  optionalAuth?: boolean;
}

/** Route không cần đăng nhập. JwtAuthGuard gắn global nên mặc định mọi route đều cần token */
export const Public = (options: PublicOptions = {}) =>
  SetMetadata(PUBLIC_KEY, options);
