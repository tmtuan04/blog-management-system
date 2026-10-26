import { ApiProperty } from '@nestjs/swagger';
import { ROLE_CODES, type RoleCode } from '../../users/models/role.model';

/** Thông tin người đang đăng nhập, để frontend hiện menu theo role */
export class AuthUserDto {
  id!: number;
  fullName!: string;
  email!: string;
  /** Đường dẫn trong uploads/, null nếu chưa có */
  avatar!: string | null;

  @ApiProperty({ enum: ROLE_CODES })
  role!: RoleCode;
}

export class TokenPairDto {
  /** JWT, hạn 15 phút. Gửi trong header Authorization: Bearer ... */
  accessToken!: string;
  /** Hạn 7 ngày, dùng một lần ở /auth/refresh */
  refreshToken!: string;
}

export class LoginResponseDto extends TokenPairDto {
  user!: AuthUserDto;
}
