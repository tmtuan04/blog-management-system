import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  POST_STATUSES,
  type PostStatus,
} from '../models/post-translation.model';
import { optionalQuery } from './post-fields';

/** GET /admin/posts (UC13) */
export class AdminPostQueryDto extends PaginationQueryDto {
  /** Lọc theo trạng thái của bản gốc */
  @ApiPropertyOptional({ enum: POST_STATUSES })
  @optionalQuery
  @IsOptional()
  @IsIn(POST_STATUSES, { message: 'Trạng thái không hợp lệ.' })
  status?: PostStatus;

  /** Mã ngôn ngữ, ví dụ `en`: bài có bản dịch ở ngôn ngữ đó */
  @optionalQuery
  @IsOptional()
  @IsString({ message: 'Ngôn ngữ không hợp lệ.' })
  language?: string;

  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  @IsOptional()
  @IsInt({ message: 'Danh mục không hợp lệ.' })
  @Min(1, { message: 'Danh mục không hợp lệ.' })
  categoryId?: number;

  /** Tìm trong tiêu đề của mọi bản dịch */
  @optionalQuery
  @IsOptional()
  @IsString({ message: 'Từ khóa tối đa 100 ký tự.' })
  @MaxLength(100, { message: 'Từ khóa tối đa 100 ký tự.' })
  q?: string;
}
