import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppConfig } from '../../config/configuration';
import { User } from '../users/models/user.model';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserStatusService } from './user-status.service';

@Module({
  imports: [
    PassportModule,
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
    SequelizeModule.forFeature([User]),
  ],
  providers: [JwtStrategy, UserStatusService],
  exports: [JwtModule, UserStatusService],
})
export class AuthModule {}
