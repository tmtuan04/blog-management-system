export class PublicPostCategoryDto {
  /** Tên theo ngôn ngữ đang chọn, thiếu thì dùng tên ngôn ngữ mặc định */
  name!: string;
  slug!: string;
}

export class PublicPostAuthorDto {
  fullName!: string;
  /** Đường dẫn trong uploads/, null nếu chưa có ảnh */
  avatar!: string | null;
}

/** Thẻ bài viết ở trang chủ, sidebar, trang danh mục (UC05, UC07) */
export class PublicPostCardDto {
  /** Slug của bản dịch ở ngôn ngữ đang chọn */
  slug!: string;
  title!: string;
  excerpt!: string | null;
  /** Đường dẫn trong uploads/, null nếu không có ảnh */
  thumbnail!: string | null;
  /** null nếu danh mục chưa có tên ở cả ngôn ngữ đang chọn lẫn ngôn ngữ mặc định */
  category!: PublicPostCategoryDto | null;
  author!: PublicPostAuthorDto;
  /** ISO 8601 UTC */
  publishedAt!: string | null;
  viewCount!: number;
  /** Số chữ trong nội dung đã bỏ thẻ / 200, làm tròn lên, tối thiểu 1 */
  readingMinutes!: number;
}
