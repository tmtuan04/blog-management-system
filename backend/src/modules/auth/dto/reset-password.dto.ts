import { IsNotEmpty, IsString } from 'class-validator';
import { Match } from '../../../common/validators/match.validator';
import {
  NewPasswordField,
  PASSWORD_MISMATCH_MESSAGE,
  REQUIRED_MESSAGE,
} from './auth-fields';

/** UC03 bước 4: token lấy từ link trong email */
export class ResetPasswordDto {
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @IsString({ message: REQUIRED_MESSAGE })
  token!: string;

  /** Ràng buộc giống UC01 */
  @NewPasswordField()
  password!: string;

  @Match('password', { message: PASSWORD_MISMATCH_MESSAGE })
  confirmPassword!: string;
}
