/** Tên và slug của danh mục ở một ngôn ngữ */
export class CategoryTranslationItemDto {
  /** Mã ngôn ngữ */
  code!: string;
  name!: string;
  slug!: string;
}

/** Một dòng của màn quản lý danh mục (UC15) */
export class AdminCategoryDto {
  id!: number;
  /** Ngôn ngữ mặc định đứng đầu. Ngôn ngữ chưa có tên thì không có trong mảng */
  translations!: CategoryTranslationItemDto[];
  /** Số bài viết thuộc danh mục, mọi trạng thái. Lớn hơn 0 thì không xóa được */
  postCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
