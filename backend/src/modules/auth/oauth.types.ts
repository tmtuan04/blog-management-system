import type { OauthProvider } from '../users/models/oauth-account.model';

/**
 * Thông tin chung mọi provider OAuth trả về (UC20). Strategy chỉ chuyển profile của
 * provider sang dạng này, việc tìm / tạo tài khoản nằm ở AuthService, nên thêm Google
 * chỉ cần thêm strategy.
 */
export interface OauthProfile {
  provider: OauthProvider;
  /** ID của user bên provider, lưu vào oauth_accounts.provider_user_id */
  providerUserId: string;
  /** Email đã xác minh, đã trim và viết thường. null thì báo OAUTH_NO_EMAIL */
  email: string | null;
  /** Có thể rỗng, AuthService tự thay khi tạo tài khoản */
  fullName: string;
  /** URL ảnh bên provider */
  avatar: string | null;
}
