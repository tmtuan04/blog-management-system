import { EmailField } from './auth-fields';

/** UC03 bước 1 */
export class ForgotPasswordDto {
  @EmailField()
  email!: string;
}
