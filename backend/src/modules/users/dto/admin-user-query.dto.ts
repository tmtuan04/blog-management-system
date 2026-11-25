import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { optionalQuery } from '../../posts/dto/post-fields';
import { ROLE_CODES, type RoleCode } from '../models/role.model';

/** `?isActive=true|false`. Chuỗi rỗng coi như không lọc, giá trị khác để validator báo lỗi */
const toBoolean = Transform(({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }
  const text = value.trim().toLowerCase();
  if (text === '') {
    return undefined;
  }
  if (text === 'true') {
    return true;
  }
  return text === 'false' ? false : value;
});

/** GET /admin/users (UC14) */
export class AdminUserQueryDto extends PaginationQueryDto {
  /** Tìm theo họ tên hoặc email, tối đa 100 ký tự */
  @optionalQuery
  @IsOptional()
  @IsString({ message: 'Từ khóa tối đa 100 ký tự.' })
  @MaxLength(100, { message: 'Từ khóa tối đa 100 ký tự.' })
  q?: string;

  /** Lọc theo vai trò */
  @optionalQuery
  @IsOptional()
  @IsIn(ROLE_CODES, { message: 'Vai trò không hợp lệ.' })
  @ApiPropertyOptional({ enum: ROLE_CODES })
  role?: RoleCode;

  /** `true`: đang hoạt động, `false`: đã khóa. Không gửi thì lấy cả hai */
  @toBoolean
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái không hợp lệ.' })
  isActive?: boolean;
}
