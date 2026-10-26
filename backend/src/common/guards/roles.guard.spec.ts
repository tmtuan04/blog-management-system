import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '../../modules/users/models/role.model';
import { AppException } from '../errors';
import { RolesGuard, hasRole } from './roles.guard';

describe('hasRole', () => {
  it('super_admin qua mọi @Roles', () => {
    expect(hasRole('super_admin', ['blog_owner'])).toBe(true);
    expect(hasRole('super_admin', ['user'])).toBe(true);
  });

  it('blog_owner qua @Roles("user") nhưng không qua @Roles("super_admin")', () => {
    expect(hasRole('blog_owner', ['user'])).toBe(true);
    expect(hasRole('blog_owner', ['super_admin'])).toBe(false);
  });

  it('user không qua @Roles("blog_owner")', () => {
    expect(hasRole('user', ['blog_owner'])).toBe(false);
  });
});

describe('RolesGuard', () => {
  const contextFor = (role?: RoleCode) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { id: 1, role, jti: 'j' } : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  const guardWith = (roles?: RoleCode[]) => {
    const reflector = {
      getAllAndOverride: () => roles,
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('route không có @Roles thì cho qua', () => {
    expect(guardWith(undefined).canActivate(contextFor('user'))).toBe(true);
  });

  it('sai role thì 403', () => {
    expect(() =>
      guardWith(['super_admin']).canActivate(contextFor('blog_owner')),
    ).toThrow(AppException);
  });

  it('chưa đăng nhập thì 401', () => {
    try {
      guardWith(['user']).canActivate(contextFor());
      fail('phải ném lỗi');
    } catch (error) {
      expect((error as AppException).getStatus()).toBe(401);
    }
  });
});
