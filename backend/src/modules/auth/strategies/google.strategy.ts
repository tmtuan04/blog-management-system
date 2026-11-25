import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AppConfig } from '../../../config/configuration';
import { OauthProfile } from '../oauth.types';
import { pickVerifiedEmail } from './github.strategy';

/** passport-oauth2 báo lỗi lúc khởi động nếu clientID rỗng */
const NOT_CONFIGURED = 'not-configured';

/**
 * UC20 - Đăng nhập bằng Google. Chỉ đọc profile, không đụng database.
 * Scope `profile` (tên, ảnh) và `email` (email kèm cờ `email_verified`). Google chỉ
 * trả một email: `emails[0] = { value, verified }`, verified là boolean.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<AppConfig, true>) {
    const google = config.get('oauth', { infer: true }).google;
    super({
      clientID: google.clientId || NOT_CONFIGURED,
      clientSecret: google.clientSecret || NOT_CONFIGURED,
      callbackURL: google.callbackUrl,
      scope: ['profile', 'email'],
    });
    if (!google.clientId || !google.clientSecret) {
      new Logger(GoogleStrategy.name).warn(
        'Chưa đặt GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, đăng nhập Google không dùng được',
      );
    }
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OauthProfile {
    return {
      provider: 'google',
      // `sub` của Google: cố định với mỗi tài khoản, không đổi khi người dùng đổi email
      providerUserId: String(profile.id),
      // Chỉ nhận email đã xác minh, cùng lý do với GitHub (UC20 liên kết theo email)
      email: pickVerifiedEmail(profile.emails),
      fullName: (profile.displayName || '').trim(),
      avatar: profile.photos?.[0]?.value ?? null,
    };
  }
}
