import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from 'sequelize';
import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { PageTranslation } from './page-translation.model';

export const PAGE_KEYS = ['about', 'contact', 'privacy'] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

/** Danh sách cố định, chỉ tạo bằng seeder (D12) */
@Table({ tableName: 'pages', underscored: true })
export class Page extends Model<
  InferAttributes<Page>,
  InferCreationAttributes<Page>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  key!: PageKey;

  /** Áp dụng cho mọi ngôn ngữ */
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isVisible!: CreationOptional<boolean>;

  @HasMany(() => PageTranslation)
  translations?: NonAttribute<PageTranslation[]>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
