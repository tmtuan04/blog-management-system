import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const DEFAULT_COMMENT_LIMIT = 20;

/** GET /post-translations/:id/comments: phân trang theo bình luận gốc, mặc định 20 mỗi trang */
export class CommentQueryDto extends PaginationQueryDto {
  /** Số bình luận gốc mỗi trang, mặc định 20, tối đa 50 */
  limit: number = DEFAULT_COMMENT_LIMIT;
}
