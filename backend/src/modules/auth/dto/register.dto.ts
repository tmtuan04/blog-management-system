import { Match } from '../../../common/validators/match.validator';
import {
  EmailField,
  FullNameField,
  NewPasswordField,
  PASSWORD_MISMATCH_MESSAGE,
} from './auth-fields';

/** UC01 - Đăng ký */
export class RegisterDto {
  /** 2-150 ký tự */
  @FullNameField()
  fullName!: string;

  @EmailField()
  email!: string;

  /** Ít nhất 8 ký tự, có cả chữ và số */
  @NewPasswordField()
  password!: string;

  @Match('password', { message: PASSWORD_MISMATCH_MESSAGE })
  confirmPassword!: string;
}
