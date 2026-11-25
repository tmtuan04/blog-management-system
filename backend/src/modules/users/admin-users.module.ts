import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { UsersModule } from './users.module';

/**
 * UC14 - Quản lý người dùng. Tách khỏi UsersModule vì AuthModule đã import
 * UsersModule, import ngược sẽ thành vòng phụ thuộc.
 */
@Module({
  imports: [
    UsersModule,
    // TokenService: thu hồi refresh token. UserStatusService: xóa cache is_active
    AuthModule,
  ],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
