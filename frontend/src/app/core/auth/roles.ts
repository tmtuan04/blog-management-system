import { RoleCode } from '../models/auth-user.model';

/** Giống `ROLE_LEVEL` của backend (`common/guards/roles.guard.ts`): role cao kế thừa quyền role thấp. */
const ROLE_LEVEL: Record<RoleCode, number> = {
  user: 1,
  blog_owner: 2,
  super_admin: 3,
};

/** `true` nếu `role` bằng hoặc cao hơn ít nhất một role trong `required`. */
export function hasRole(
  role: RoleCode,
  required: readonly RoleCode[],
): boolean {
  return required.some((r) => ROLE_LEVEL[role] >= ROLE_LEVEL[r]);
}
