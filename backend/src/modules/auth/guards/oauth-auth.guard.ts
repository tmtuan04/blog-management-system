import { Injectable, Logger, Type, mixin } from '@nestjs/common';
import { AuthGuard, IAuthGuard, IAuthModuleOptions } from '@nestjs/passport';
import type { OauthProvider } from '../../users/models/oauth-account.model';
import { OauthProfile } from '../oauth.types';

/**
 * UC20. Tạo guard cho một provider OAuth, dùng cho cả hai route của provider đó:
 * - `GET /auth/<provider>`: passport chuyển hướng sang provider.
 * - `GET /auth/<provider>/callback`: không ném lỗi, vì AllExceptionsFilter sẽ trả JSON
 *   và trình duyệt dừng ở trang JSON. Người dùng hủy hoặc provider lỗi thì
 *   `req.user = null`, controller chuyển hướng về frontend kèm `?error=OAUTH_FAILED`.
 *
 * `options` truyền vào `passport.authenticate`, ví dụ tham số thêm cho trang đăng nhập
 * của provider.
 */
export function OauthAuthGuard(
  provider: OauthProvider,
  options: IAuthModuleOptions = {},
): Type<IAuthGuard> {
  @Injectable()
  class OauthGuard extends AuthGuard(provider) {
    private readonly logger = new Logger(`OauthAuthGuard(${provider})`);

    getAuthenticateOptions(): IAuthModuleOptions {
      return options;
    }

    handleRequest<TUser = OauthProfile | null>(
      err: unknown,
      user: TUser | false,
    ): TUser {
      if (err) {
        const message =
          err instanceof Error ? err.message : JSON.stringify(err);
        this.logger.warn(`Đăng nhập ${provider} lỗi: ${message}`);
      }
      return (err || !user ? null : user) as TUser;
    }
  }
  return mixin(OauthGuard);
}

export const GithubAuthGuard = OauthAuthGuard('github');

/** `select_account`: luôn hiện màn chọn tài khoản, không tự vào tài khoản Google đang mở */
export const GoogleAuthGuard = OauthAuthGuard('google', {
  prompt: 'select_account',
});
