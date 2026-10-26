import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Role, RoleCode } from './models/role.model';
import { User } from './models/user.model';

export interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string | null;
  role: RoleCode;
}

/** Truy vấn tài khoản dùng chung cho auth (UC01-UC04), profile (UC12), admin (UC14) */
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Role) private readonly roleModel: typeof Role,
  ) {}

  /** Kèm role. `withPassword` để lấy cả password_hash khi cần so mật khẩu */
  findByEmail(
    email: string,
    options: { withPassword?: boolean } = {},
  ): Promise<User | null> {
    const model = options.withPassword
      ? this.userModel.scope('withPassword')
      : this.userModel;
    return model.findOne({ where: { email }, include: [Role] });
  }

  findById(id: number): Promise<User | null> {
    return this.userModel.findByPk(id, { include: [Role] });
  }

  async emailExists(email: string): Promise<boolean> {
    return (await this.userModel.count({ where: { email } })) > 0;
  }

  async create(input: CreateUserInput): Promise<User> {
    const role = await this.roleModel.findOne({ where: { code: input.role } });
    if (!role) {
      throw new Error(`Chưa có role ${input.role}, cần chạy seeder 01-roles`);
    }
    const user = await this.userModel.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash: input.passwordHash,
      roleId: role.id,
    });
    user.role = role;
    return user;
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.userModel.update({ passwordHash }, { where: { id } });
  }
}
