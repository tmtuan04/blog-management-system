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
import { Category } from './category.model';

/** Bắt buộc có bản dịch của ngôn ngữ mặc định. Thiếu ngôn ngữ nào thì dùng tên mặc định */
@Table({ tableName: 'category_translations', underscored: true })
export class CategoryTranslation extends Model<
  InferAttributes<CategoryTranslation>,
  InferCreationAttributes<CategoryTranslation>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @ForeignKey(() => Category)
  @Column({ type: DataType.INTEGER, allowNull: false })
  categoryId!: FK<number>;

  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER, allowNull: false })
  languageId!: FK<number>;

  @Column({ type: DataType.STRING(150), allowNull: false })
  name!: string;

  /** Sinh từ name, duy nhất trong cùng ngôn ngữ */
  @Column({ type: DataType.STRING(180), allowNull: false })
  slug!: string;

  @BelongsTo(() => Category)
  category?: NonAttribute<Category>;

  @BelongsTo(() => Language)
  language?: NonAttribute<Language>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
