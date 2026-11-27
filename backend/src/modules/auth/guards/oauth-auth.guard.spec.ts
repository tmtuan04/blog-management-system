import { Logger } from '@nestjs/common';
import { OauthProfile } from '../oauth.types';
import {
  GithubAuthGuard,
  GoogleAuthGuard,
  OauthAuthGuard,
} from './oauth-auth.guard';

/** Phần của guard mà test gọi trực tiếp */
interface OauthGuardInternals {
  getAuthenticateOptions(): object;
  handleRequest(err: unknown, user: unknown): unknown;
}

const create = (guard: ReturnType<typeof OauthAuthGuard>) =>
  new guard() as unknown as OauthGuardInternals;

const PROFILE: OauthProfile = {
  provider: 'google',
  providerUserId: '1',
  email: 'a@gmail.com',
  fullName: 'A',
  avatar: null,
};

describe('OauthAuthGuard', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('đăng nhập thành công: trả profile', () => {
    expect(create(GoogleAuthGuard).handleRequest(null, PROFILE)).toBe(PROFILE);
  });

  it('người dùng hủy (user = false): trả null, không ném lỗi', () => {
    expect(create(GithubAuthGuard).handleRequest(null, false)).toBeNull();
  });

  it('provider lỗi: trả null, không ném lỗi, có ghi log', () => {
    const guard = create(GoogleAuthGuard);
    expect(guard.handleRequest(new Error('invalid_grant'), false)).toBeNull();
    expect(warn).toHaveBeenCalledWith('Đăng nhập google lỗi: invalid_grant');
  });

  it('lỗi không phải Error vẫn ghi log được', () => {
    create(GithubAuthGuard).handleRequest({ message: 'bad' }, false);
    expect(warn).toHaveBeenCalledWith(
      'Đăng nhập github lỗi: {"message":"bad"}',
    );
  });

  it('Google luôn hiện màn chọn tài khoản', () => {
    expect(create(GoogleAuthGuard).getAuthenticateOptions()).toEqual({
      prompt: 'select_account',
    });
  });

  it('GitHub không truyền tham số thêm', () => {
    expect(create(GithubAuthGuard).getAuthenticateOptions()).toEqual({});
  });
});
