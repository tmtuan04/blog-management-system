import { PartialType } from '@nestjs/swagger';
import { TranslationFieldsDto } from './translation-fields.dto';

/**
 * UC13 - Sửa một bản dịch. Trường không gửi thì giữ nguyên, `excerpt: ""` là bỏ
 * tóm tắt. Đổi tiêu đề thì sinh lại slug.
 */
export class UpdateTranslationDto extends PartialType(TranslationFieldsDto) {}
