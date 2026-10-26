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
import { Comment } from '../../comments/models/comment.model';
import { Language } from '../../languages/models/language.model';
import { Post } from './post.model';

export const POST_STATUSES = ['draft', 'published', 'archived'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * Bản dịch có languageId = post.languageId là bản gốc: tạo cùng lúc với bài,
 * không xóa riêng được (kiểm tra ở service).
 */
@Table({ tableName: 'post_translations', underscored: true })
export class PostTranslation extends Model<
  InferAttributes<PostTranslation>,
  InferCreationAttributes<PostTranslation>
> {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @ForeignKey(() => Post)
  @Column({ type: DataType.BIGINT, allowNull: false })
  postId!: FK<number>;

  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER, allowNull: false })
  languageId!: FK<number>;

  @Column({ type: DataType.STRING(255), allowNull: false })
  title!: string;

  @Column({ type: DataType.STRING(280), allowNull: false })
  slug!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  excerpt!: CreationOptional<string | null>;

  /** HTML đã lọc XSS */
  @Column({ type: DataType.TEXT('medium'), allowNull: false })
  content!: string;

  @Column({
    type: DataType.ENUM(...POST_STATUSES),
    allowNull: false,
    defaultValue: 'draft',
  })
  status!: CreationOptional<PostStatus>;

  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  })
  viewCount!: CreationOptional<number>;

  /** Ghi lần đầu bản dịch chuyển sang published */
  @Column({ type: DataType.DATE, allowNull: true })
  publishedAt!: CreationOptional<Date | null>;

  @BelongsTo(() => Post)
  post?: NonAttribute<Post>;

  @BelongsTo(() => Language)
  language?: NonAttribute<Language>;

  @HasMany(() => Comment)
  comments?: NonAttribute<Comment[]>;

  createdAt!: CreationOptional<Date>;
  updatedAt!: CreationOptional<Date>;
}
