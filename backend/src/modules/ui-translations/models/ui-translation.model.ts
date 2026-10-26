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
import { Language } from '../../languages/models/language.model';

/**
 * Thêm ngôn ngữ mới thì sao chép mọi key từ ngôn ngữ mặc định.
 * `key` là từ khóa của MySQL: truy vấn raw phải viết `key` trong dấu `.
 */
@Table({ tableName: 'ui_translations', underscored: true })
export class UiTranslation extends Model<
  InferAttributes<UiTranslation>,
  InferCreationAttributes<UiTranslation>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER, allowNull: false })
  languageId!: FK<number>;

  /** Ví dụ menu.home */
  @Column({ type: DataType.STRING(150), allowNull: false })
  key!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  value!: string;

  @BelongsTo(() => Language)
  language?: NonAttribute<Language>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
