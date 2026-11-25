import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ROLE_CODES, type RoleCode } from '../models/role.model';
import { ROLE_MESSAGE } from './create-admin-user.dto';

/** PATCH /admin/users/:id/role (UC14) */
export class UpdateUserRoleDto {
  /** Vai trò mới */
  @IsIn(ROLE_CODES, { message: ROLE_MESSAGE })
  @ApiProperty({ enum: ROLE_CODES })
  role!: RoleCode;
}
