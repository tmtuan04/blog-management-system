import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '../../modules/users/models/role.model';

export const ROLES_KEY = 'roles';

/**
 * Role được gọi route. Kế thừa role xử lý trong RolesGuard:
 * `super_admin` qua mọi `@Roles`, `blog_owner` qua `@Roles('user')`.
 */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
