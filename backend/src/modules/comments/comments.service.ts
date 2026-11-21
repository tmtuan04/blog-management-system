import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError } from 'sequelize';
import { AppException } from '../../common/errors';
import type { AuthUser } from '../../common/types/request-context';
import { Paginated, paginate, toOffset } from '../../common/utils/paginate';
import { Post } from '../posts/models/post.model';
import { PostTranslation } from '../posts/models/post-translation.model';
import { User } from '../users/models/user.model';
import { canDeleteComment } from './comment-permissions';
import { CommentQueryDto } from './dto/comment-query.dto';
import { CommentDto, CommentThreadDto } from './dto/comment-response.dto';
import {
  COMMENT_PARENT_MESSAGE,
  CreateCommentDto,
} from './dto/create-comment.dto';
import { Comment } from './models/comment.model';

const POST_NOT_FOUND = 'Không tìm thấy bài viết';
const COMMENT_NOT_FOUND = 'Không tìm thấy bình luận';
const DELETE_FORBIDDEN = 'Bạn không có quyền xóa bình luận này';

/** Chỉ lấy tên và ảnh của người viết, không lấy email hay mật khẩu */
const AUTHOR_INCLUDE = {
  model: User,
  as: 'user',
  attributes: ['id', 'fullName', 'avatar'],
  required: true,
};

/** UC08 - Bình luận (phase 3 doc mục 4.3). Không cache: luôn đọc dữ liệu mới nhất */
@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment) private readonly commentModel: typeof Comment,
    @InjectModel(PostTranslation)
    private readonly postTranslationModel: typeof PostTranslation,
  ) {}

  /**
   * GET /post-translations/:id/comments: bình luận gốc mới nhất trước, phân trang;
   * mỗi bình luận kèm toàn bộ trả lời (cũ nhất trước). Trả lời lấy bằng một truy vấn
   * chung cho cả trang nên không bị N+1.
   */
  async list(
    translationId: number,
    query: CommentQueryDto,
    viewer?: AuthUser,
  ): Promise<Paginated<CommentThreadDto>> {
    const postOwnerId = await this.findPostOwnerId(translationId);

    const { rows, count } = await this.commentModel.findAndCountAll({
      where: { postTranslationId: translationId, parentId: null },
      include: [AUTHOR_INCLUDE],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      ...toOffset(query),
    });

    const replies = rows.length
      ? await this.commentModel.findAll({
          // Thêm postTranslationId (kết quả không đổi) để dùng được index
          // (post_translation_id, parent_id, created_at), không phải sort riêng
          where: {
            postTranslationId: translationId,
            parentId: rows.map((row) => Number(row.id)),
          },
          include: [AUTHOR_INCLUDE],
          order: [
            ['createdAt', 'ASC'],
            ['id', 'ASC'],
          ],
        })
      : [];

    const repliesByParent = new Map<number, CommentDto[]>();
    for (const reply of replies) {
      const parentId = Number(reply.parentId);
      const dto = this.toDto(reply, postOwnerId, viewer);
      const group = repliesByParent.get(parentId);
      if (group) {
        group.push(dto);
      } else {
        repliesByParent.set(parentId, [dto]);
      }
    }

    const items = rows.map((row) => ({
      ...this.toDto(row, postOwnerId, viewer),
      replies: repliesByParent.get(Number(row.id)) ?? [],
    }));
    return paginate(items, count, query);
  }

  /**
   * POST /post-translations/:id/comments. `parentId` phải là bình luận gốc
   * (`parent_id = NULL`) của cùng bản dịch, chỉ trả lời 1 cấp.
   */
  async create(
    translationId: number,
    dto: CreateCommentDto,
    user: AuthUser,
  ): Promise<CommentDto> {
    const parentId = dto.parentId ?? null;
    // Hai truy vấn độc lập: chạy song song
    const [postOwnerId, parent] = await Promise.all([
      this.findPostOwnerId(translationId),
      parentId === null ? null : this.commentModel.findByPk(parentId),
    ]);

    if (
      parentId !== null &&
      (!parent ||
        Number(parent.postTranslationId) !== translationId ||
        (parent.parentId !== null && parent.parentId !== undefined))
    ) {
      throw this.invalidParent();
    }

    let created: Comment;
    try {
      created = await this.commentModel.create({
        postTranslationId: translationId,
        userId: user.id,
        parentId,
        content: dto.content,
      });
    } catch (error) {
      // Bản dịch hoặc bình luận cha bị xóa giữa lúc kiểm tra và lúc lưu:
      // trả đúng lỗi như khi kiểm tra (404 hoặc 400), không để thành 409
      if (error instanceof ForeignKeyConstraintError) {
        await this.findPostOwnerId(translationId);
        if (parentId !== null) {
          throw this.invalidParent();
        }
      }
      throw error;
    }

    // Tải lại kèm người viết để trả đủ tên và ảnh. Không còn thì bình luận
    // vừa bị xóa theo bình luận cha (ON DELETE CASCADE)
    const comment = await this.commentModel.findByPk(created.id, {
      include: [AUTHOR_INCLUDE],
    });
    if (!comment) {
      throw AppException.notFound(COMMENT_NOT_FOUND);
    }
    return this.toDto(comment, postOwnerId, user);
  }

  /** DELETE /comments/:id. Các trả lời bị xóa theo (ON DELETE CASCADE) */
  async remove(id: number, user: AuthUser): Promise<void> {
    const comment = await this.commentModel.findByPk(id, {
      include: [
        {
          model: PostTranslation,
          as: 'postTranslation',
          attributes: ['id'],
          required: true,
          include: [
            {
              model: Post,
              as: 'post',
              attributes: ['id', 'userId'],
              required: true,
            },
          ],
        },
      ],
    });
    if (!comment) {
      throw AppException.notFound(COMMENT_NOT_FOUND);
    }
    const postOwnerId = Number(comment.postTranslation!.post!.userId);
    if (!canDeleteComment(user, Number(comment.userId), postOwnerId)) {
      throw AppException.forbidden(DELETE_FORBIDDEN);
    }
    await comment.destroy();
  }

  /** Id tác giả bài. Bản dịch không có hoặc chưa `published` thì 404 */
  private async findPostOwnerId(translationId: number): Promise<number> {
    const translation = await this.postTranslationModel.findOne({
      where: { id: translationId, status: 'published' },
      attributes: ['id'],
      include: [
        {
          model: Post,
          as: 'post',
          attributes: ['id', 'userId'],
          required: true,
        },
      ],
    });
    if (!translation) {
      throw AppException.notFound(POST_NOT_FOUND);
    }
    return Number(translation.post!.userId);
  }

  private invalidParent(): AppException {
    return AppException.validation([
      { field: 'parentId', message: COMMENT_PARENT_MESSAGE },
    ]);
  }

  private toDto(
    row: Comment,
    postOwnerId: number,
    viewer?: AuthUser,
  ): CommentDto {
    const userId = Number(row.userId);
    return {
      id: Number(row.id),
      parentId:
        row.parentId === null || row.parentId === undefined
          ? null
          : Number(row.parentId),
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      author: {
        fullName: row.user?.fullName ?? '',
        avatar: row.user?.avatar ?? null,
        isPostAuthor: userId === postOwnerId,
      },
      canDelete: canDeleteComment(viewer, userId, postOwnerId),
    };
  }
}
