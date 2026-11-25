import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  EmailField,
  FullNameField,
  NewPasswordField,
} from '../../auth/dto/auth-fields';
import { ROLE_CODES, type RoleCode } from '../models/role.model';

export const ROLE_MESSAGE = 'Vai trò không hợp lệ.';

/** POST /admin/users (UC14). Ràng buộc họ tên, email, mật khẩu giống UC01 */
export class CreateAdminUserDto {
  /** 2-150 ký tự */
  @FullNameField()
  fullName!: string;

  /** Chưa có trong hệ thống */
  @EmailField()
  email!: string;

  /** Mật khẩu tạm: ít nhất 8 ký tự, có cả chữ và số */
  @NewPasswordField()
  password!: string;

  /** Vai trò của tài khoản mới */
  @IsIn(ROLE_CODES, { message: ROLE_MESSAGE })
  @ApiProperty({ enum: ROLE_CODES })
  role!: RoleCode;
}
