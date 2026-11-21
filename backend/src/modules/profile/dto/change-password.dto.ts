import { IsOptional, IsString } from 'class-validator';
import { Match } from '../../../common/validators/match.validator';
import {
  NewPasswordField,
  PASSWORD_MISMATCH_MESSAGE,
  REQUIRED_MESSAGE,
} from '../../auth/dto/auth-fields';

/** UC12 - Đổi mật khẩu */
export class ChangePasswordDto {
  /**
   * Bắt buộc khi tài khoản đã có mật khẩu (`hasPassword = true`). Tài khoản OAuth
   * chưa có mật khẩu thì bỏ qua. Service kiểm tra vì phụ thuộc dữ liệu trong DB.
   */
  @IsOptional()
  @IsString({ message: REQUIRED_MESSAGE })
  currentPassword?: string;

  /** Ít nhất 8 ký tự, có cả chữ và số (giống UC01) */
  @NewPasswordField()
  newPassword!: string;

  @Match('newPassword', { message: PASSWORD_MISMATCH_MESSAGE })
  confirmPassword!: string;
}
