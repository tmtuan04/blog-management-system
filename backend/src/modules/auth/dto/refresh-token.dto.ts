import { IsNotEmpty, IsString } from 'class-validator';
import { REQUIRED_MESSAGE } from './auth-fields';

/** UC02 refresh, UC04 logout */
export class RefreshTokenDto {
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @IsString({ message: REQUIRED_MESSAGE })
  refreshToken!: string;
}
