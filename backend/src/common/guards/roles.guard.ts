import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '../../modules/users/models/role.model';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppException, ErrorCode } from '../errors';
import { AppRequest } from '../types/request-context';

/** Cấp của role. Role cấp cao kế thừa quyền của role cấp thấp (requirements mục 2) */
const ROLE_LEVEL: Record<RoleCode, number> = {
  user: 1,
  blog_owner: 2,
  super_admin: 3,
};

export function hasRole(userRole: RoleCode, required: RoleCode[]): boolean {
  return required.some((role) => ROLE_LEVEL[userRole] >= ROLE_LEVEL[role]);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleCode[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }
    const user = context.switchToHttp().getRequest<AppRequest>().user;
    if (!user) {
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED);
    }
    if (!hasRole(user.role, required)) {
      throw AppException.forbidden();
    }
    return true;
  }
}
