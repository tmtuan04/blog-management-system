import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { optionalQuery } from '../../posts/dto/post-fields';

/** GET /admin/categories (UC15) */
export class AdminCategoryQueryDto extends PaginationQueryDto {
  /** Tìm trong tên danh mục ở mọi ngôn ngữ */
  @optionalQuery
  @IsOptional()
  @IsString({ message: 'Từ khóa tối đa 100 ký tự.' })
  @MaxLength(100, { message: 'Từ khóa tối đa 100 ký tự.' })
  q?: string;
}
