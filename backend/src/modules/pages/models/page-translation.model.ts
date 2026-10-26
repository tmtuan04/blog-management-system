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
import { Page } from './page.model';

/** Ngôn ngữ không mặc định để trống cả title và content thì không lưu dòng */
@Table({ tableName: 'page_translations', underscored: true })
export class PageTranslation extends Model<
  InferAttributes<PageTranslation>,
  InferCreationAttributes<PageTranslation>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @ForeignKey(() => Page)
  @Column({ type: DataType.INTEGER, allowNull: false })
  pageId!: FK<number>;

  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER, allowNull: false })
  languageId!: FK<number>;

  @Column({ type: DataType.STRING(255), allowNull: false })
  title!: string;

  /** HTML đã lọc XSS */
  @Column({ type: DataType.TEXT('medium'), allowNull: false })
  content!: string;

  @BelongsTo(() => Page)
  page?: NonAttribute<Page>;

  @BelongsTo(() => Language)
  language?: NonAttribute<Language>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
