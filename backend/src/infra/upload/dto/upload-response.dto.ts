export class UploadResponseDto {
  /** Lưu vào DB, ví dụ trường `thumbnail` của bài viết */
  path!: string;
  /** URL đầy đủ để hiện ảnh */
  url!: string;
}
