import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OauthAccount } from './models/oauth-account.model';
import { Role } from './models/role.model';
import { User } from './models/user.model';
import { UsersService } from './users.service';

@Module({
  imports: [SequelizeModule.forFeature([User, Role, OauthAccount])],
  providers: [UsersService],
  exports: [UsersService, SequelizeModule],
})
export class UsersModule {}
