import { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-github2';
import { AppConfig } from '../../../config/configuration';
import { GithubStrategy, pickVerifiedEmail } from './github.strategy';

const configWith = (github: AppConfig['oauth']['github']) =>
  ({
    get: () => ({ github }),
  }) as unknown as ConfigService<AppConfig, true>;

const CONFIGURED = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  callbackUrl: 'http://localhost:3000/api/v1/auth/github/callback',
};

describe('pickVerifiedEmail', () => {
  it('ưu tiên email chính đã xác minh', () => {
    expect(
      pickVerifiedEmail([
        { value: 'phu@example.com', primary: false, verified: true },
        { value: 'chinh@example.com', primary: true, verified: true },
      ]),
    ).toBe('chinh@example.com');
  });

  it('email chính chưa xác minh thì lấy email đã xác minh khác', () => {
    expect(
      pickVerifiedEmail([
        { value: 'chinh@example.com', primary: true, verified: false },
        { value: 'phu@example.com', primary: false, verified: true },
      ]),
    ).toBe('phu@example.com');
  });

  it('không có email đã xác minh thì trả null', () => {
    expect(
      pickVerifiedEmail([
        { value: 'a@example.com', primary: true, verified: false },
        { value: 'b@example.com' },
      ]),
    ).toBeNull();
  });

  it('không có danh sách email thì trả null', () => {
    expect(pickVerifiedEmail(undefined)).toBeNull();
    expect(pickVerifiedEmail([])).toBeNull();
  });

  it('trim và viết thường như RegisterDto', () => {
    expect(
      pickVerifiedEmail([
        { value: '  User@Example.COM ', primary: true, verified: true },
      ]),
    ).toBe('user@example.com');
  });
});

describe('GithubStrategy', () => {
  it('chuyển profile GitHub sang OauthProfile', () => {
    const strategy = new GithubStrategy(configWith(CONFIGURED));
    const profile = {
      id: '12345',
      displayName: ' Nguyễn Văn A ',
      username: 'nguyenvana',
      emails: [{ value: 'a@example.com', primary: true, verified: true }],
      photos: [{ value: 'https://avatars.githubusercontent.com/u/12345' }],
    } as unknown as Profile;

    expect(strategy.validate('at', 'rt', profile)).toEqual({
      provider: 'github',
      providerUserId: '12345',
      email: 'a@example.com',
      fullName: 'Nguyễn Văn A',
      avatar: 'https://avatars.githubusercontent.com/u/12345',
    });
  });

  it('không có tên hiển thị thì dùng username, không có ảnh thì avatar null', () => {
    const strategy = new GithubStrategy(configWith(CONFIGURED));
    const profile = {
      id: 7,
      displayName: '',
      username: 'octocat',
    } as unknown as Profile;

    expect(strategy.validate('at', 'rt', profile)).toMatchObject({
      providerUserId: '7',
      email: null,
      fullName: 'octocat',
      avatar: null,
    });
  });

  it('chưa cấu hình client id vẫn khởi tạo được (máy chưa đăng ký app OAuth)', () => {
    expect(
      () =>
        new GithubStrategy(
          configWith({ clientId: '', clientSecret: '', callbackUrl: '' }),
        ),
    ).not.toThrow();
  });
});
