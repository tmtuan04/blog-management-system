import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PUBLIC_KEY, PublicOptions } from '../decorators/public.decorator';
import { AppException, ErrorCode } from '../errors';
import { AppRequest, AuthUser } from '../types/request-context';

/**
 * Gắn global. Mọi route cần access token, trừ route có `@Public()`.
 * Token hết hạn trả 401 `TOKEN_EXPIRED` để frontend gọi /auth/refresh.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const options = this.getPublicOptions(context);
    if (options && !options.optionalAuth) {
      return true;
    }
    if (options?.optionalAuth) {
      const req = context.switchToHttp().getRequest<AppRequest>();
      if (!req.headers.authorization) {
        return true;
      }
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthUser>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (this.getPublicOptions(context)?.optionalAuth) {
      // Token lỗi hoặc tài khoản bị khóa ở route public: coi như khách
      return (err || !user ? undefined : user) as TUser;
    }
    if (err) {
      throw err as Error;
    }
    if (!user) {
      if ((info as Error | undefined)?.name === 'TokenExpiredError') {
        throw new AppException(
          HttpStatus.UNAUTHORIZED,
          ErrorCode.TOKEN_EXPIRED,
          'Phiên đăng nhập đã hết hạn',
        );
      }
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED);
    }
    return user;
  }

  private getPublicOptions(
    context: ExecutionContext,
  ): PublicOptions | undefined {
    return this.reflector.getAllAndOverride<PublicOptions>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
