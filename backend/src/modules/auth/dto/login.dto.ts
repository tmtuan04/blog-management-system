import { IsNotEmpty, IsString } from 'class-validator';
import { EmailField, REQUIRED_MESSAGE } from './auth-fields';

/** UC02 - Đăng nhập */
export class LoginDto {
  @EmailField()
  email!: string;

  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @IsString({ message: REQUIRED_MESSAGE })
  password!: string;
}
