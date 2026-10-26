import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from 'sequelize';
import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { Post } from '../../posts/models/post.model';
import { CategoryTranslation } from './category-translation.model';

/** Không xóa được khi còn bài viết (FK posts.category_id RESTRICT) */
@Table({ tableName: 'categories', underscored: true })
export class Category extends Model<
  InferAttributes<Category>,
  InferCreationAttributes<Category>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @HasMany(() => CategoryTranslation)
  translations?: NonAttribute<CategoryTranslation[]>;

  @HasMany(() => Post)
  posts?: NonAttribute<Post[]>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
