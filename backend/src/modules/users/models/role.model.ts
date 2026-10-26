import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from 'sequelize';
import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

export const ROLE_CODES = ['user', 'blog_owner', 'super_admin'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

@Table({ tableName: 'roles', underscored: true })
export class Role extends Model<
  InferAttributes<Role>,
  InferCreationAttributes<Role>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @Column({ type: DataType.STRING(30), allowNull: false, unique: true })
  code!: RoleCode;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @HasMany(() => User)
  users?: NonAttribute<User[]>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
