import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'languages', underscored: true })
export class Language extends Model<
  InferAttributes<Language>,
  InferCreationAttributes<Language>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  /** ISO 639-1: vi, en... */
  @Column({ type: DataType.STRING(10), allowNull: false, unique: true })
  code!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  /** Luôn đúng 1 dòng = true, đảm bảo ở service trong transaction */
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isDefault!: CreationOptional<boolean>;

  /** Không được tắt ngôn ngữ mặc định */
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: CreationOptional<boolean>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
