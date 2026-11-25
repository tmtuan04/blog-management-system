import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { OauthAccount, OauthProvider } from './models/oauth-account.model';
import { Role, RoleCode } from './models/role.model';
import { User } from './models/user.model';

export interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string | null;
  role: RoleCode;
}

/** Một dòng oauth_accounts (UC20) */
export interface OauthLinkInput {
  provider: OauthProvider;
  providerUserId: string;
  providerEmail: string | null;
}

/** UC20: tài khoản mới tạo qua OAuth */
export interface CreateOauthUserInput extends OauthLinkInput {
  fullName: string;
  email: string;
  /** URL ảnh bên provider */
  avatar: string | null;
}

/** Truy vấn tài khoản dùng chung cho auth (UC01-UC04, UC20), profile (UC12), admin (UC14) */
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Role) private readonly roleModel: typeof Role,
    @InjectModel(OauthAccount)
    private readonly oauthModel: typeof OauthAccount,
    private readonly sequelize: Sequelize,
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

  /** Kèm role. `withPassword` để biết tài khoản đã có mật khẩu chưa (UC12) */
  findById(
    id: number,
    options: { withPassword?: boolean } = {},
  ): Promise<User | null> {
    const model = options.withPassword
      ? this.userModel.scope('withPassword')
      : this.userModel;
    return model.findByPk(id, { include: [Role] });
  }

  async emailExists(email: string): Promise<boolean> {
    return (await this.userModel.count({ where: { email } })) > 0;
  }

  async create(input: CreateUserInput): Promise<User> {
    const role = await this.findRole(input.role);
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

  /** UC12: chỉ nhận họ tên và avatar, email và role không đổi qua đây */
  async updateProfile(
    id: number,
    values: Partial<Pick<User, 'fullName' | 'avatar'>>,
  ): Promise<void> {
    await this.userModel.update(values, { where: { id } });
  }

  /** UC20: user đã liên kết với tài khoản này của provider, kèm role */
  async findByOauth(
    provider: OauthProvider,
    providerUserId: string,
  ): Promise<User | null> {
    const account = await this.oauthModel.findOne({
      where: { provider, providerUserId },
      include: [{ model: User, include: [Role] }],
    });
    return account?.user ?? null;
  }

  /** UC20: mỗi user liên kết tối đa 1 tài khoản / provider (unique user_id, provider) */
  async hasOauth(userId: number, provider: OauthProvider): Promise<boolean> {
    return (await this.oauthModel.count({ where: { userId, provider } })) > 0;
  }

  /** UC20: liên kết tài khoản provider vào user có sẵn */
  async linkOauth(
    userId: number,
    input: OauthLinkInput,
    transaction?: Transaction,
  ): Promise<void> {
    await this.oauthModel.create(
      {
        userId,
        provider: input.provider,
        providerUserId: input.providerUserId,
        providerEmail: input.providerEmail,
      },
      { transaction },
    );
  }

  /**
   * UC20: tạo tài khoản role user, chưa có mật khẩu (password_hash NULL), và liên
   * kết provider trong cùng một transaction.
   */
  async createFromOauth(input: CreateOauthUserInput): Promise<User> {
    const role = await this.findRole('user');
    return this.sequelize.transaction(async (transaction) => {
      const user = await this.userModel.create(
        {
          fullName: input.fullName,
          email: input.email,
          passwordHash: null,
          avatar: input.avatar,
          roleId: role.id,
        },
        { transaction },
      );
      await this.linkOauth(user.id, input, transaction);
      user.role = role;
      return user;
    });
  }

  private async findRole(code: RoleCode): Promise<Role> {
    const role = await this.roleModel.findOne({ where: { code } });
    if (!role) {
      throw new Error(`Chưa có role ${code}, cần chạy seeder 01-roles`);
    }
    return role;
  }
}
