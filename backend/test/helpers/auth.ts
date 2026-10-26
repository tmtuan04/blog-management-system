import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import { Role, RoleCode } from '../../src/modules/users/models/role.model';
import { User } from '../../src/modules/users/models/user.model';

export const TEST_PASSWORD = 'Password123';

export interface TestUser {
  user: User;
  token: string;
}

let passwordHash: string | undefined;

/** Tạo user với role cho trước, mật khẩu TEST_PASSWORD */
export async function createUser(
  role: RoleCode,
  overrides: Partial<{
    email: string;
    fullName: string;
    isActive: boolean;
  }> = {},
): Promise<User> {
  passwordHash ??= await hash(TEST_PASSWORD, 10);
  const roleRow = await Role.findOne({ where: { code: role } });
  return User.create({
    fullName: overrides.fullName ?? `Test ${role}`,
    email: overrides.email ?? `${role}-${randomUUID().slice(0, 8)}@test.local`,
    passwordHash,
    roleId: roleRow!.id,
    isActive: overrides.isActive ?? true,
  });
}

/**
 * Tạo user + access token cho role, để test API cần đăng nhập mà không phải gọi
 * /auth/login (phase 3 doc mục 3.2).
 *
 * @example const { token } = await tokenFor(app, 'super_admin');
 *          request(server).get('/api/v1/admin/users').set('Authorization', `Bearer ${token}`)
 */
export async function tokenFor(
  app: INestApplication,
  role: RoleCode,
  overrides: Parameters<typeof createUser>[1] = {},
): Promise<TestUser> {
  const user = await createUser(role, overrides);
  const token = await app
    .get(JwtService)
    .signAsync({ sub: user.id, role, jti: randomUUID() });
  return { user, token };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
