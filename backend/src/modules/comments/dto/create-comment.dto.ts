import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { containsHtml } from '../../../common/utils/html-sanitize';

export const COMMENT_MIN_LENGTH = 1;
export const COMMENT_MAX_LENGTH = 1000;

/** Câu của `invalid-feedback` ở `post-detail.html` (key `validation.comment_length`) */
export const COMMENT_LENGTH_MESSAGE = 'Bình luận phải có từ 1 đến 1000 ký tự.';
export const COMMENT_HTML_MESSAGE =
  'Bình luận chỉ được là văn bản thuần, không chứa thẻ HTML.';
export const COMMENT_PARENT_MESSAGE = 'Bình luận được trả lời không hợp lệ.';

/** Văn bản không được chứa thẻ HTML (UC08): có thẻ thì báo lỗi, không lọc rồi lưu */
function NoHtml(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'noHtml',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        // Chỉ báo khi thực sự có thẻ HTML; sai kiểu hoặc thiếu do IsString báo
        validate: (value: unknown) =>
          typeof value !== 'string' || !containsHtml(value),
      },
    });
  };
}

/** POST /post-translations/:id/comments (UC08) */
export class CreateCommentDto {
  /** Nội dung 1-1000 ký tự sau khi bỏ khoảng trắng hai đầu, văn bản thuần (không nhận HTML) */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  // Decorator chạy từ dưới lên và mỗi field chỉ báo lỗi đầu tiên: kiểu → độ dài → HTML
  @NoHtml({ message: COMMENT_HTML_MESSAGE })
  @Length(COMMENT_MIN_LENGTH, COMMENT_MAX_LENGTH, {
    message: COMMENT_LENGTH_MESSAGE,
  })
  @IsString({ message: COMMENT_LENGTH_MESSAGE })
  content!: string;

  /**
   * Id bình luận được trả lời. Phải là bình luận gốc của cùng bản dịch (chỉ trả lời 1 cấp).
   * Không gửi thì đây là bình luận gốc
   */
  @IsOptional()
  @IsInt({ message: COMMENT_PARENT_MESSAGE })
  @Min(1, { message: COMMENT_PARENT_MESSAGE })
  parentId?: number | null;
}
