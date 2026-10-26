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
import { PostTranslation } from '../../posts/models/post-translation.model';
import { User } from '../../users/models/user.model';

/**
 * parentId = NULL là bình luận gốc. Chỉ 1 cấp: parent phải có parentId = NULL
 * và cùng postTranslationId (kiểm tra ở service).
 */
@Table({ tableName: 'comments', underscored: true })
export class Comment extends Model<
  InferAttributes<Comment>,
  InferCreationAttributes<Comment>
> {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @ForeignKey(() => PostTranslation)
  @Column({ type: DataType.BIGINT, allowNull: false })
  postTranslationId!: FK<number>;

  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, allowNull: false })
  userId!: FK<number>;

  @ForeignKey(() => Comment)
  @Column({ type: DataType.BIGINT, allowNull: true })
  parentId!: CreationOptional<FK<number> | null>;

  /** Văn bản thuần, 1-1000 ký tự */
  @Column({ type: DataType.STRING(1000), allowNull: false })
  content!: string;

  @BelongsTo(() => PostTranslation)
  postTranslation?: NonAttribute<PostTranslation>;

  @BelongsTo(() => User)
  user?: NonAttribute<User>;

  @BelongsTo(() => Comment, 'parentId')
  parent?: NonAttribute<Comment>;

  @HasMany(() => Comment, 'parentId')
  replies?: NonAttribute<Comment[]>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
