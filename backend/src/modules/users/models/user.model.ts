import type {
  CreationOptional,
  ForeignKey as FK,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  DefaultScope,
  ForeignKey,
  HasMany,
  Model,
  Scopes,
  Table,
} from 'sequelize-typescript';
import { OauthAccount } from './oauth-account.model';
import { Role } from './role.model';

/**
 * Mặc định không lấy password_hash. Cần so mật khẩu thì dùng
 * `User.scope('withPassword')`.
 */
@DefaultScope(() => ({ attributes: { exclude: ['passwordHash'] } }))
@Scopes(() => ({ withPassword: { attributes: { include: ['passwordHash'] } } }))
@Table({ tableName: 'users', underscored: true })
export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @Column({ type: DataType.STRING(150), allowNull: false })
  fullName!: string;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  email!: string;

  /** NULL với tài khoản tạo qua OAuth chưa đặt mật khẩu */
  @Column({ type: DataType.STRING(255), allowNull: true })
  passwordHash!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  avatar!: CreationOptional<string | null>;

  @ForeignKey(() => Role)
  @Column({ type: DataType.INTEGER, allowNull: false })
  roleId!: FK<number>;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: CreationOptional<boolean>;

  @BelongsTo(() => Role)
  role?: NonAttribute<Role>;

  @HasMany(() => OauthAccount)
  oauthAccounts?: NonAttribute<OauthAccount[]>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
