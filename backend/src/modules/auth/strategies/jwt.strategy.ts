import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppException, ErrorCode } from '../../../common/errors';
import { AuthUser } from '../../../common/types/request-context';
import { AppConfig } from '../../../config/configuration';
import { RoleCode } from '../../users/models/role.model';
import { UserStatusService } from '../user-status.service';

/** Nội dung access token: user id, role code, id phiên */
export interface AccessTokenPayload {
  sub: number;
  role: RoleCode;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly userStatus: UserStatusService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).accessSecret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (!(await this.userStatus.isActive(payload.sub))) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.ACCOUNT_LOCKED,
        'Tài khoản của bạn đã bị khóa. Liên hệ quản trị viên để được hỗ trợ.',
      );
    }
    return { id: payload.sub, role: payload.role, jti: payload.jti };
  }
}
