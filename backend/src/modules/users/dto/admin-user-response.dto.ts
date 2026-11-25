import { ApiProperty } from '@nestjs/swagger';
import { ROLE_CODES, type RoleCode } from '../models/role.model';

/** Một dòng của màn quản lý người dùng (UC14). Không bao giờ có `passwordHash` */
export class AdminUserDto {
  id!: number;
  fullName!: string;
  email!: string;
  /** Đường dẫn trong uploads/ hoặc URL ngoài (OAuth), null nếu chưa có */
  avatar!: string | null;

  @ApiProperty({ enum: ROLE_CODES })
  role!: RoleCode;

  /** false nghĩa là tài khoản đã bị khóa */
  isActive!: boolean;
  /** true với chính người đang gọi API, để màn hình vô hiệu nút khóa và đổi vai trò */
  isSelf!: boolean;
  createdAt!: Date;
}
