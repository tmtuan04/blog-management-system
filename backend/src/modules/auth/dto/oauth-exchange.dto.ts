import { IsNotEmpty, IsString } from 'class-validator';
import { REQUIRED_MESSAGE } from './auth-fields';

/** UC20: mã frontend nhận ở `/oauth/callback?code=...` */
export class OauthExchangeDto {
  /** Mã dùng một lần, hạn 60 giây */
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @IsString({ message: REQUIRED_MESSAGE })
  code!: string;
}
