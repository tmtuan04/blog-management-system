import { IsBoolean } from 'class-validator';

/** PATCH /admin/users/:id/status (UC14) */
export class UpdateUserStatusDto {
  /** `false`: khóa tài khoản (thu hồi mọi phiên đăng nhập), `true`: mở khóa */
  @IsBoolean({ message: 'Trạng thái không hợp lệ.' })
  isActive!: boolean;
}
