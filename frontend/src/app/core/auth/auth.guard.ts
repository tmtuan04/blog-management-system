import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route cần đăng nhập (`/profile`, `/admin/**`). Chưa đăng nhập thì về `/login?returnUrl=<url>`.
 * Guard chỉ để giao diện hợp lý; quyền thật do backend kiểm tra.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Màn chỉ dành cho khách (`/login`, `/register`, `/forgot-password`, `/reset-password`). Đã đăng nhập thì về `/`. */
export const guestGuard: CanActivateFn = () => {
  if (!inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/']);
};
