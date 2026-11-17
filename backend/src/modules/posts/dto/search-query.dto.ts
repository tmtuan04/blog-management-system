import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Câu trong `invalid-feedback` của màn `public/search.html` */
const SEARCH_LENGTH_MESSAGE = 'Từ khóa cần từ 2 đến 100 ký tự.';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

/** GET /search (UC19) */
export class SearchQueryDto extends PaginationQueryDto {
  /**
   * Từ khóa, 2-100 ký tự sau khi bỏ khoảng trắng hai đầu. Chuẩn hóa về NFC để
   * chữ có dấu gõ kiểu tổ hợp (NFD) vẫn khớp với nội dung đã lưu.
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().normalize('NFC') : value,
  )
  @IsString({ message: SEARCH_LENGTH_MESSAGE })
  @Length(SEARCH_MIN_LENGTH, SEARCH_MAX_LENGTH, {
    message: SEARCH_LENGTH_MESSAGE,
  })
  q!: string;
}
