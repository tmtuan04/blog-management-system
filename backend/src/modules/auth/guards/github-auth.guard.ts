import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OauthProfile } from '../oauth.types';

/**
 * UC20. `GET /auth/github`: passport chuyển hướng sang GitHub.
 * `GET /auth/github/callback`: không ném lỗi, vì AllExceptionsFilter sẽ trả JSON và
 * trình duyệt dừng ở trang JSON. Người dùng hủy hoặc GitHub lỗi thì `req.user = null`,
 * controller chuyển hướng về frontend kèm `?error=OAUTH_FAILED`.
 */
@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  private readonly logger = new Logger(GithubAuthGuard.name);

  handleRequest<TUser = OauthProfile | null>(
    err: unknown,
    user: TUser | false,
  ): TUser {
    if (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Đăng nhập GitHub lỗi: ${message}`);
    }
    return (err || !user ? null : user) as TUser;
  }
}
