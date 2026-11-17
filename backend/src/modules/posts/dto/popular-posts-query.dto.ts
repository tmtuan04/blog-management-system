import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PopularPostsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn phải là số nguyên' })
  @Min(1, { message: 'Giới hạn phải lớn hơn hoặc bằng 1' })
  @Max(10, { message: 'Giới hạn tối đa là 10' })
  limit: number = 5;
}
