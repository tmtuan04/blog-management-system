import { ApiProperty } from '@nestjs/swagger';
import { ROLE_CODES, type RoleCode } from '../../users/models/role.model';

/** UC12 - Hồ sơ của người đang đăng nhập */
export class ProfileResponseDto {
  fullName!: string;
  /** Chỉ xem, không tự đổi được */
  email!: string;
  /** Đường dẫn trong uploads/, null nếu chưa có */
  avatar!: string | null;

  /** Chỉ xem, không tự đổi được */
  @ApiProperty({ enum: ROLE_CODES })
  role!: RoleCode;

  /** false với tài khoản OAuth chưa đặt mật khẩu: không cần nhập mật khẩu hiện tại khi đổi */
  hasPassword!: boolean;
}
