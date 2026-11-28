import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { RoleCode } from '../models/auth-user.model';
import { AuthService } from './auth.service';
import { hasRole } from './roles';

/** Route màn 403 (A1 bước 6). roleGuard hiện màn này mà giữ nguyên URL trên thanh địa chỉ. */
export const FORBIDDEN_PATH = '/403';

/**
 * Route cần role, khai báo `data: { roles: ['blog_owner'] }`. Kế thừa role giống backend:
 * `super_admin` qua mọi `roles`, `blog_owner` qua `user`.
 *
 * Chưa đăng nhập: về `/login?returnUrl=<url>`. Không đủ role: hiện màn 403, URL giữ nguyên.
 *
 * @example { path: 'admin/users', canActivate: [authGuard, roleGuard], data: { roles: ['super_admin'] } }
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const role = auth.role();
  if (role === null) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const required = (route.data['roles'] ?? []) as RoleCode[];
  if (required.length === 0 || hasRole(role, required)) return true;

  return new RedirectCommand(router.parseUrl(FORBIDDEN_PATH), {
    skipLocationChange: true,
  });
};
