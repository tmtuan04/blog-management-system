import {
  PublicPostAuthorDto,
  PublicPostCategoryDto,
} from './public-post-response.dto';

/** Một ngôn ngữ đang hoạt động mà bài có bản dịch published (UC06, UC09) */
export class PostAvailableLanguageDto {
  code!: string;
  name!: string;
  /** Slug của bản dịch ở ngôn ngữ này, để chuyển sang `/posts/:slug` khi đổi ngôn ngữ */
  slug!: string;
}

/** Chi tiết bài viết ở ngôn ngữ đang chọn (UC06) */
export class PublicPostDetailDto {
  /** Id bản dịch, dùng cho API bình luận (UC08) */
  translationId!: number;
  slug!: string;
  title!: string;
  excerpt!: string | null;
  /** HTML đã lọc XSS khi lưu */
  content!: string;
  /** Đường dẫn trong uploads/, null nếu không có ảnh */
  thumbnail!: string | null;
  /** null nếu danh mục chưa có tên ở cả ngôn ngữ đang chọn lẫn ngôn ngữ mặc định */
  category!: PublicPostCategoryDto | null;
  author!: PublicPostAuthorDto;
  /** ISO 8601 UTC */
  publishedAt!: string | null;
  /** Đã tính lượt xem của request này (nếu được tính) */
  viewCount!: number;
  /** Số chữ trong nội dung đã bỏ thẻ / 200, làm tròn lên, tối thiểu 1 */
  readingMinutes!: number;
  /** Số bình luận của bản dịch này, gồm cả trả lời */
  commentCount!: number;
  /** Gồm cả ngôn ngữ đang xem; ngôn ngữ mặc định đứng đầu */
  availableLanguages!: PostAvailableLanguageDto[];
  /** Người đang xem là tác giả bài hoặc Super Admin; khách thì false */
  canDeleteComments!: boolean;
}
