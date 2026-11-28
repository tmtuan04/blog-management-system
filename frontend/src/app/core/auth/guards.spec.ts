import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleCode } from '../models/auth-user.model';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

describe('guards', () => {
  let router: Router;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  function loginAs(role: RoleCode): void {
    auth.setSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: {
        id: 1,
        fullName: 'Test',
        email: 't@example.com',
        avatar: null,
        role,
      },
    });
  }

  function run(
    guard: CanActivateFn,
    roles?: RoleCode[],
    url = '/admin/posts?page=2',
  ) {
    const route = {
      data: roles ? { roles } : {},
    } as unknown as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => guard(route, state));
  }

  function urlOf(result: unknown): string {
    expect(result).toBeInstanceOf(UrlTree);
    return router.serializeUrl(result as UrlTree);
  }

  function expectForbidden(result: unknown): void {
    expect(result).toBeInstanceOf(RedirectCommand);
    const command = result as RedirectCommand;
    expect(router.serializeUrl(command.redirectTo)).toBe('/403');
    expect(command.navigationBehaviorOptions?.skipLocationChange).toBe(true);
  }

  describe('authGuard', () => {
    it('khách: về /login kèm returnUrl', () => {
      expect(urlOf(run(authGuard))).toBe(
        '/login?returnUrl=%2Fadmin%2Fposts%3Fpage%3D2',
      );
    });

    it.each<RoleCode>(['user', 'blog_owner', 'super_admin'])(
      '%s: cho qua',
      (role) => {
        loginAs(role);
        expect(run(authGuard)).toBe(true);
      },
    );
  });

  describe('guestGuard', () => {
    it('khách: cho qua', () => {
      expect(run(guestGuard)).toBe(true);
    });

    it('đã đăng nhập: về /', () => {
      loginAs('user');
      expect(urlOf(run(guestGuard))).toBe('/');
    });
  });

  describe('roleGuard', () => {
    it('khách: về /login kèm returnUrl', () => {
      expect(urlOf(run(roleGuard, ['blog_owner']))).toBe(
        '/login?returnUrl=%2Fadmin%2Fposts%3Fpage%3D2',
      );
    });

    it.each<[RoleCode, RoleCode[], boolean]>([
      ['user', ['user'], true],
      ['user', ['blog_owner'], false],
      ['user', ['super_admin'], false],
      ['blog_owner', ['user'], true],
      ['blog_owner', ['blog_owner'], true],
      ['blog_owner', ['super_admin'], false],
      ['super_admin', ['user'], true],
      ['super_admin', ['blog_owner'], true],
      ['super_admin', ['super_admin'], true],
    ])('%s vào route cần %j: %s', (role, roles, allowed) => {
      loginAs(role);
      const result = run(roleGuard, roles);
      if (allowed) expect(result).toBe(true);
      else expectForbidden(result);
    });

    it('route không khai báo roles: chỉ cần đăng nhập', () => {
      loginAs('user');
      expect(run(roleGuard)).toBe(true);
    });
  });
});
