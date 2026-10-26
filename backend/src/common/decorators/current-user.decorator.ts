import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AppRequest, AuthUser } from '../types/request-context';

/** Người đang đăng nhập. Route `@Public({ optionalAuth: true })` có thể nhận `undefined` */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<AppRequest>().user,
);
