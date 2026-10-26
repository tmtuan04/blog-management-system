import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../../common/errors';
import { RedisService } from '../../infra/redis/redis.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const jwt = new JwtService({ secret: 'access-secret-1234567890' });
  const multi = {
    set: jest.fn().mockReturnThis(),
    sadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    srem: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };
  const client = {
    multi: () => multi,
    getdel: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    del: jest.fn(),
  };
  const config = {
    get: () => ({
      refreshSecret: 'refresh-secret-1234567890',
      refreshTtl: 604800,
    }),
  } as unknown as ConfigService;
  const service = new TokenService(
    jwt,
    { client } as unknown as RedisService,
    config as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('issue: access token chứa sub, role, jti; lưu jti của refresh token 7 ngày', async () => {
    const { accessToken, refreshToken } = await service.issue({
      id: 5,
      role: 'blog_owner',
    });
    const access = jwt.decode<{ sub: number; role: string; jti: string }>(
      accessToken,
    );
    const refresh = jwt.decode<{ sub: number; jti: string }>(refreshToken);
    expect(access).toMatchObject({ sub: 5, role: 'blog_owner' });
    expect(refresh.jti).toBe(access.jti);
    expect(multi.set).toHaveBeenCalledWith(
      `auth:refresh:${refresh.jti}`,
      '5',
      'EX',
      604800,
    );
    expect(multi.sadd).toHaveBeenCalledWith('auth:user-refresh:5', refresh.jti);
  });

  it('refresh token ký bằng secret riêng: access token không dùng làm refresh được', async () => {
    const { accessToken } = await service.issue({ id: 5, role: 'user' });
    await expect(service.consume(accessToken)).rejects.toBeInstanceOf(
      AppException,
    );
    expect(client.getdel).not.toHaveBeenCalled();
  });

  it('consume: xóa jti (dùng một lần) và trả userId', async () => {
    const { refreshToken } = await service.issue({ id: 5, role: 'user' });
    client.getdel.mockResolvedValueOnce('5');
    await expect(service.consume(refreshToken)).resolves.toBe(5);
    expect(client.srem).toHaveBeenCalledWith(
      'auth:user-refresh:5',
      expect.any(String),
    );
  });

  it('consume: jti đã bị thu hồi hoặc đã dùng thì 401 TOKEN_EXPIRED', async () => {
    const { refreshToken } = await service.issue({ id: 5, role: 'user' });
    client.getdel.mockResolvedValueOnce(null);
    const error = (await service
      .consume(refreshToken)
      .catch((e: unknown) => e)) as AppException;
    expect(error.getStatus()).toBe(401);
    expect(error.code).toBe('TOKEN_EXPIRED');
  });

  it('consume: token rác thì 401', async () => {
    await expect(service.consume('abc')).rejects.toBeInstanceOf(AppException);
  });

  it('revoke: chỉ thu hồi token của chính user', async () => {
    const { refreshToken } = await service.issue({ id: 5, role: 'user' });
    jest.clearAllMocks();
    await service.revoke(refreshToken, 6);
    expect(multi.del).not.toHaveBeenCalled();
    await service.revoke(refreshToken, 5);
    expect(multi.del).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:refresh:/),
    );
    await service.revoke('abc', 5);
    expect(multi.del).toHaveBeenCalledTimes(1);
  });

  it('revokeAll: xóa mọi jti trong set và chính set đó', async () => {
    client.smembers.mockResolvedValueOnce(['j1', 'j2']);
    await service.revokeAll(5);
    expect(client.del).toHaveBeenCalledWith(
      'auth:user-refresh:5',
      'auth:refresh:j1',
      'auth:refresh:j2',
    );
  });
});
