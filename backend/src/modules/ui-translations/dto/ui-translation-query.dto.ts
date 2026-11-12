import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const KEYWORD_MESSAGE = 'Từ khóa tối đa 100 ký tự.';

/** GET /admin/ui-translations (UC17). Phân trang theo key, mặc định 50 key mỗi trang */
export class UiTranslationQueryDto extends PaginationQueryDto {
  /** Số key mỗi trang, tối đa 50 */
  override limit: number = 50;

  /** Tìm theo key hoặc giá trị. Rỗng thì không lọc */
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString({ message: KEYWORD_MESSAGE })
  @MaxLength(100, { message: KEYWORD_MESSAGE })
  q?: string;
}
