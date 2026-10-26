import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { AppException, ErrorCode } from '../../common/errors';
import { CacheTtl, RedisKeys } from '../../common/utils/redis-keys';
import { AppConfig } from '../../config/configuration';
import { MailService } from '../../infra/mail/mail.service';
import { RedisService } from '../../infra/redis/redis.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import {
  AuthUserDto,
  LoginResponseDto,
  TokenPairDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenService } from './token.service';

export const BCRYPT_COST = 10;
export const MAX_LOGIN_FAILS = 5;

/** Hash giả để so khi email không tồn tại, thời gian phản hồi không lộ email nào có thật */
const DUMMY_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.4oQkPpQxvLUu0Eiqk3JcN0B2cS1a';

export const toAuthUser = (user: User): AuthUserDto => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  avatar: user.avatar ?? null,
  role: user.role!.code,
});

const accountLocked = () =>
  new AppException(
    HttpStatus.FORBIDDEN,
    ErrorCode.ACCOUNT_LOCKED,
    'Tài khoản của bạn đã bị khóa. Liên hệ quản trị viên để được hỗ trợ.',
  );

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.frontendUrl = config.get('frontendUrl', { infer: true });
  }

  /** UC01: tài khoản mới có role user, đang hoạt động */
  async register(dto: RegisterDto): Promise<AuthUserDto> {
    if (await this.users.emailExists(dto.email)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.CONFLICT,
        'Email này đã được đăng ký.',
        [{ field: 'email', message: 'Email này đã được đăng ký.' }],
      );
    }
    const user = await this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash: await hash(dto.password, BCRYPT_COST),
      role: 'user',
    });
    return toAuthUser(user);
  }

  /**
   * UC02. Sai email hoặc mật khẩu dùng chung một thông báo. Quá 5 lần sai trong
   * 15 phút theo IP + email thì 429; đăng nhập đúng thì xóa bộ đếm.
   */
  async login(dto: LoginDto, ip: string): Promise<LoginResponseDto> {
    const failKey = RedisKeys.loginFail(ip, dto.email);
    const fails = Number(await this.redis.client.get(failKey)) || 0;
    if (fails >= MAX_LOGIN_FAILS) {
      throw new AppException(
        HttpStatus.TOO_MANY_REQUESTS,
        ErrorCode.TOO_MANY_REQUESTS,
        'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',
      );
    }

    const user = await this.users.findByEmail(dto.email, {
      withPassword: true,
    });
    // Tài khoản OAuth chưa đặt mật khẩu (password_hash NULL) cũng coi là sai
    const valid = await compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !valid) {
      const count = await this.redis.client.incr(failKey);
      if (count === 1) {
        await this.redis.client.expire(failKey, CacheTtl.loginFail);
      }
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS,
        'Email hoặc mật khẩu không đúng.',
      );
    }

    await this.redis.client.del(failKey);
    if (!user.isActive) {
      throw accountLocked();
    }
    const tokens = await this.tokens.issue({
      id: user.id,
      role: user.role!.code,
    });
    return { ...tokens, user: toAuthUser(user) };
  }

  /** UC02: xoay vòng, refresh token cũ không dùng lại được */
  async refresh(refreshToken: string): Promise<TokenPairDto> {
    const userId = await this.tokens.consume(refreshToken);
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.TOKEN_EXPIRED,
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
      );
    }
    if (!user.isActive) {
      throw accountLocked();
    }
    // Lấy role mới nhất, để đổi role (UC14) có hiệu lực từ lần refresh tiếp theo
    return this.tokens.issue({ id: user.id, role: user.role!.code });
  }

  /** UC04 */
  logout(refreshToken: string, userId: number): Promise<void> {
    return this.tokens.revoke(refreshToken, userId);
  }

  /**
   * UC03 bước 1-3. Luôn trả cùng một kết quả để không lộ email nào đã đăng ký.
   * Lỗi gửi email chỉ ghi log.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user?.isActive) {
      return;
    }
    const token = randomBytes(32).toString('hex');
    await this.redis.client.set(
      RedisKeys.resetToken(token),
      String(user.id),
      'EX',
      CacheTtl.resetToken,
    );
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    try {
      await this.mail.sendPasswordReset(user.email, user.fullName, link);
    } catch (error) {
      this.logger.error(
        `Gửi email đặt lại mật khẩu cho user ${user.id} thất bại`,
        (error as Error).stack,
      );
    }
  }

  /** UC03 bước 4-5. Token dùng một lần; thành công thì thu hồi mọi refresh token */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.redis.client.getdel(
      RedisKeys.resetToken(dto.token),
    );
    const user = userId ? await this.users.findById(Number(userId)) : null;
    if (!user) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.RESET_TOKEN_INVALID,
        'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Gửi lại yêu cầu để nhận link mới.',
      );
    }
    await this.users.updatePassword(
      user.id,
      await hash(dto.password, BCRYPT_COST),
    );
    await this.tokens.revokeAll(user.id);
  }

  /** GET /auth/me */
  async me(userId: number): Promise<AuthUserDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED);
    }
    return toAuthUser(user);
  }
}
