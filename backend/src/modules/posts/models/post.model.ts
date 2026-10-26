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
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Category } from '../../categories/models/category.model';
import { Language } from '../../languages/models/language.model';
import { User } from '../../users/models/user.model';
import { PostTranslation } from './post-translation.model';

/** Phần dùng chung của bài viết. Nội dung theo từng ngôn ngữ nằm ở post_translations */
@Table({ tableName: 'posts', underscored: true })
export class Post extends Model<
  InferAttributes<Post>,
  InferCreationAttributes<Post>
> {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  /** Tác giả */
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, allowNull: false })
  userId!: FK<number>;

  /** Ngôn ngữ gốc, không đổi được */
  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER, allowNull: false })
  languageId!: FK<number>;

  @ForeignKey(() => Category)
  @Column({ type: DataType.INTEGER, allowNull: false })
  categoryId!: FK<number>;

  /** Đường dẫn file trong uploads/, dùng chung cho mọi bản dịch */
  @Column({ type: DataType.STRING(255), allowNull: true })
  thumbnail!: CreationOptional<string | null>;

  @BelongsTo(() => User)
  author?: NonAttribute<User>;

  @BelongsTo(() => Language)
  language?: NonAttribute<Language>;

  @BelongsTo(() => Category)
  category?: NonAttribute<Category>;

  @HasMany(() => PostTranslation)
  translations?: NonAttribute<PostTranslation[]>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
