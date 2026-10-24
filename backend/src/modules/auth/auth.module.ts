import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfig } from '../../config/configuration';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';
import { UserStatusService } from './user-status.service';

/**
 * Module khác cần thu hồi phiên (khóa tài khoản UC14) thì import AuthModule và dùng
 * `TokenService.revokeAll(userId)` + `UserStatusService.invalidate(userId)`.
 */
@Module({
  imports: [
    PassportModule,
    UsersModule,
    // Ký access token. Refresh token dùng secret riêng, truyền lúc ký
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const jwt = config.get('jwt', { infer: true });
        return {
          secret: jwt.accessSecret,
          signOptions: { expiresIn: jwt.accessTtl },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtStrategy, UserStatusService],
  exports: [JwtModule, TokenService, UserStatusService],
})
export class AuthModule {}
