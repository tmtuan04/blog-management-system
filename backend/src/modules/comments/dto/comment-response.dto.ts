/** Người viết bình luận */
export class CommentAuthorDto {
  fullName!: string;
  /** Đường dẫn trong uploads/, null nếu chưa có ảnh */
  avatar!: string | null;
  /** Người viết cũng là tác giả bài, để hiện huy hiệu "Tác giả" */
  isPostAuthor!: boolean;
}

/** Một bình luận (UC08) */
export class CommentDto {
  id!: number;
  /** null là bình luận gốc */
  parentId!: number | null;
  /** Văn bản thuần, frontend không được render bằng innerHTML */
  content!: string;
  /** ISO 8601 UTC */
  createdAt!: string;
  author!: CommentAuthorDto;
  /** Người đang xem là người viết, tác giả bài hoặc Super Admin; khách thì false */
  canDelete!: boolean;
}

/** Bình luận gốc kèm toàn bộ trả lời (cũ nhất trước) */
export class CommentThreadDto extends CommentDto {
  replies!: CommentDto[];
}
