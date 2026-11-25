import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { AppConfig } from '../../../config/configuration';
import { OauthProfile } from '../oauth.types';

/** Một dòng của GitHub `/user/emails` khi bật `allRawEmails` */
export interface GithubEmail {
  value: string;
  primary?: boolean;
  verified?: boolean;
}

/** passport-oauth2 báo lỗi lúc khởi động nếu clientID rỗng */
const NOT_CONFIGURED = 'not-configured';

/**
 * UC20 - Đăng nhập bằng GitHub. Chỉ đọc profile, không đụng database.
 * Scope `user:email` để lấy cả email đang để private; `allRawEmails` để có cờ
 * `primary`, `verified` (mặc định passport-github2 chỉ giữ email chính và bỏ cờ).
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService<AppConfig, true>) {
    const github = config.get('oauth', { infer: true }).github;
    super({
      clientID: github.clientId || NOT_CONFIGURED,
      clientSecret: github.clientSecret || NOT_CONFIGURED,
      callbackURL: github.callbackUrl,
      scope: ['user:email'],
      allRawEmails: true,
    });
    if (!github.clientId || !github.clientSecret) {
      new Logger(GithubStrategy.name).warn(
        'Chưa đặt GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET, đăng nhập GitHub không dùng được',
      );
    }
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OauthProfile {
    return {
      provider: 'github',
      providerUserId: String(profile.id),
      email: pickVerifiedEmail(profile.emails),
      fullName: (profile.displayName || profile.username || '').trim(),
      avatar: profile.photos?.[0]?.value ?? null,
    };
  }
}

/**
 * Chỉ nhận email đã xác minh, ưu tiên email chính. UC20 liên kết tài khoản theo
 * email, nhận email chưa xác minh thì ai cũng thêm được email của người khác vào
 * GitHub của mình để đăng nhập tài khoản blog của họ.
 * Chuẩn hóa giống RegisterDto (trim, viết thường).
 */
export function pickVerifiedEmail(
  emails: GithubEmail[] | undefined,
): string | null {
  const verified = (emails ?? []).filter(
    (email) => email.verified === true && email.value?.trim(),
  );
  const chosen = verified.find((email) => email.primary) ?? verified[0];
  return chosen ? chosen.value.trim().toLowerCase() : null;
}
