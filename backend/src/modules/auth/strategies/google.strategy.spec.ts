import { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';
import { AppConfig } from '../../../config/configuration';
import { GoogleStrategy } from './google.strategy';

const configWith = (google: AppConfig['oauth']['google']) =>
  ({
    get: () => ({ google }),
  }) as unknown as ConfigService<AppConfig, true>;

const CONFIGURED = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  callbackUrl: 'http://localhost:3000/api/v1/auth/google/callback',
};

/** Profile như passport-google-oauth20 dựng từ userinfo của Google */
const profileOf = (overrides: Partial<Profile> = {}): Profile =>
  ({
    id: '109876543210987654321',
    displayName: 'Nguyễn Văn A',
    emails: [{ value: 'a@gmail.com', verified: true }],
    photos: [{ value: 'https://lh3.googleusercontent.com/a/abc=s96-c' }],
    ...overrides,
  }) as unknown as Profile;

describe('GoogleStrategy', () => {
  const strategy = new GoogleStrategy(configWith(CONFIGURED));

  it('chuyển profile Google sang OauthProfile', () => {
    expect(strategy.validate('at', 'rt', profileOf())).toEqual({
      provider: 'google',
      providerUserId: '109876543210987654321',
      email: 'a@gmail.com',
      fullName: 'Nguyễn Văn A',
      avatar: 'https://lh3.googleusercontent.com/a/abc=s96-c',
    });
  });

  it('email chưa xác minh thì email null (chống chiếm tài khoản)', () => {
    const profile = profileOf({
      emails: [{ value: 'a@gmail.com', verified: false }],
    });
    expect(strategy.validate('at', 'rt', profile).email).toBeNull();
  });

  it('không có email (người dùng không cấp scope email) thì email null', () => {
    const profile = profileOf({ emails: undefined });
    expect(strategy.validate('at', 'rt', profile).email).toBeNull();
  });

  it('trim và viết thường email như RegisterDto', () => {
    const profile = profileOf({
      emails: [{ value: '  User@Example.COM ', verified: true }],
    });
    expect(strategy.validate('at', 'rt', profile).email).toBe(
      'user@example.com',
    );
  });

  it('trim họ tên; không có tên thì để rỗng cho AuthService tự thay', () => {
    expect(
      strategy.validate('at', 'rt', profileOf({ displayName: '  Trần B ' }))
        .fullName,
    ).toBe('Trần B');
    expect(
      strategy.validate(
        'at',
        'rt',
        profileOf({ displayName: undefined as unknown as string }),
      ).fullName,
    ).toBe('');
  });

  it('không có ảnh thì avatar null', () => {
    const profile = profileOf({ photos: undefined });
    expect(strategy.validate('at', 'rt', profile).avatar).toBeNull();
  });

  it('chưa cấu hình client id vẫn khởi tạo được (máy chưa đăng ký app OAuth)', () => {
    expect(
      () =>
        new GoogleStrategy(
          configWith({ clientId: '', clientSecret: '', callbackUrl: '' }),
        ),
    ).not.toThrow();
  });
});
