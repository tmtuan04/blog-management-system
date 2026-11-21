import { Module } from '@nestjs/common';
import { UploadModule } from '../../infra/upload/upload.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [
    UsersModule,
    // TokenService: thu hồi refresh token khi đổi mật khẩu
    AuthModule,
    // UploadService + giới hạn dung lượng của multer cho avatar
    UploadModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
