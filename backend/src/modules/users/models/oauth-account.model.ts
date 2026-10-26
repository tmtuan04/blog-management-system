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
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from './user.model';

export const OAUTH_PROVIDERS = ['google', 'github'] as const;
export type OauthProvider = (typeof OAUTH_PROVIDERS)[number];

@Table({ tableName: 'oauth_accounts', underscored: true })
export class OauthAccount extends Model<
  InferAttributes<OauthAccount>,
  InferCreationAttributes<OauthAccount>
> {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, allowNull: false })
  userId!: FK<number>;

  @Column({ type: DataType.ENUM(...OAUTH_PROVIDERS), allowNull: false })
  provider!: OauthProvider;

  /** ID của user bên provider */
  @Column({ type: DataType.STRING(255), allowNull: false })
  providerUserId!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  providerEmail!: CreationOptional<string | null>;

  @BelongsTo(() => User)
  user?: NonAttribute<User>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
