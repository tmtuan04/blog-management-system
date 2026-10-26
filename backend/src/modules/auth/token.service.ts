import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { AppException, ErrorCode } from '../../common/errors';
import { RedisKeys } from '../../common/utils/redis-keys';
import { AppConfig } from '../../config/configuration';
import { RedisService } from '../../infra/redis/redis.service';
import { RoleCode } from '../users/models/role.model';
import { TokenPairDto } from './dto/auth-response.dto';
import { AccessTokenPayload } from './strategies/jwt.strategy';

interface RefreshTokenPayload {
  sub: number;
  jti: string;
}

const tokenExpired = () =>
  new AppException(
    HttpStatus.UNAUTHORIZED,
    ErrorCode.TOKEN_EXPIRED,
    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
  );

/**
 * Cấp và thu hồi token (D11). Mỗi phiên có một `jti`:
 * - `auth:refresh:{jti}` = userId, hạn 7 ngày. Có key thì refresh token còn dùng được.
 * - `auth:user-refresh:{userId}` = Set các jti, để thu hồi mọi phiên của một user.
 */
@Injectable()
export class TokenService {
  private readonly refreshSecret: string;
  private readonly refreshTtl: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    config: ConfigService<AppConfig, true>,
  ) {
    const jwtConfig = config.get('jwt', { infer: true });
    this.refreshSecret = jwtConfig.refreshSecret;
    this.refreshTtl = jwtConfig.refreshTtl;
  }

  async issue(user: { id: number; role: RoleCode }): Promise<TokenPairDto> {
    const jti = randomUUID();
    const access: AccessTokenPayload = { sub: user.id, role: user.role, jti };
    const refresh: RefreshTokenPayload = { sub: user.id, jti };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(access),
      this.jwt.signAsync(refresh, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
      }),
    ]);

    const setKey = RedisKeys.userRefreshTokens(user.id);
    await this.redis.client
      .multi()
      .set(RedisKeys.refreshToken(jti), String(user.id), 'EX', this.refreshTtl)
      .sadd(setKey, jti)
      .expire(setKey, this.refreshTtl)
      .exec();

    return { accessToken, refreshToken };
  }

  /**
   * Kiểm tra refresh token và xóa luôn jti (dùng một lần). Token sai, hết hạn
   * hoặc đã dùng → 401 TOKEN_EXPIRED. Trả userId để cấp cặp token mới.
   */
  async consume(refreshToken: string): Promise<number> {
    const payload = await this.verify(refreshToken);
    if (!payload) {
      throw tokenExpired();
    }
    // GETDEL: hai request dùng cùng một refresh token thì chỉ một request thành công
    const stored = await this.redis.client.getdel(
      RedisKeys.refreshToken(payload.jti),
    );
    if (stored === null || Number(stored) !== payload.sub) {
      throw tokenExpired();
    }
    await this.redis.client.srem(
      RedisKeys.userRefreshTokens(payload.sub),
      payload.jti,
    );
    return payload.sub;
  }

  /** UC04: thu hồi refresh token của phiên hiện tại. Token sai hoặc của người khác thì bỏ qua */
  async revoke(refreshToken: string, userId: number): Promise<void> {
    const payload = await this.verify(refreshToken, { ignoreExpiration: true });
    if (!payload || payload.sub !== userId) {
      return;
    }
    await this.redis.client
      .multi()
      .del(RedisKeys.refreshToken(payload.jti))
      .srem(RedisKeys.userRefreshTokens(userId), payload.jti)
      .exec();
  }

  /** Đăng xuất mọi thiết bị: đặt lại mật khẩu (UC03), khóa tài khoản (UC14) */
  async revokeAll(userId: number): Promise<void> {
    const setKey = RedisKeys.userRefreshTokens(userId);
    const jtis = await this.redis.client.smembers(setKey);
    await this.redis.client.del(
      setKey,
      ...jtis.map((jti) => RedisKeys.refreshToken(jti)),
    );
  }

  private async verify(
    token: string,
    options: { ignoreExpiration?: boolean } = {},
  ): Promise<RefreshTokenPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
        ignoreExpiration: options.ignoreExpiration,
      });
      return typeof payload.sub === 'number' && typeof payload.jti === 'string'
        ? payload
        : null;
    } catch {
      return null;
    }
  }
}
