import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_PAGE_LIMIT = 50;

/** `limit` quá 50 thì báo lỗi 400, không tự cắt (requirements 6.2) */
export class PaginationQueryDto {
  /** Trang hiện tại, bắt đầu từ 1 */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số trang phải là số nguyên' })
  @Min(1, { message: 'Số trang tối thiểu là 1' })
  page: number = 1;

  /** Số bản ghi mỗi trang, tối đa 50 */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số bản ghi mỗi trang phải là số nguyên' })
  @Min(1, { message: 'Số bản ghi mỗi trang tối thiểu là 1' })
  @Max(MAX_PAGE_LIMIT, {
    message: `Số bản ghi mỗi trang tối đa là ${MAX_PAGE_LIMIT}`,
  })
  limit: number = 10;
}
