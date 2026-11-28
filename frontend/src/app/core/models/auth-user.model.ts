/** Mã role của backend (`roles.code`). */
export type RoleCode = 'user' | 'blog_owner' | 'super_admin';

/** Người đang đăng nhập, theo `AuthUserDto` (`GET /auth/me`, `user` của `POST /auth/login`). */
export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  /** Đường dẫn trong uploads/ (hiện qua pipe `uploadUrl`), `null` nếu chưa có */
  avatar: string | null;
  role: RoleCode;
}
