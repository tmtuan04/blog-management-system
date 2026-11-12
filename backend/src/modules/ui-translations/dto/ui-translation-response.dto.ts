import { ApiProperty } from '@nestjs/swagger';

/** Một dòng của bảng bản dịch giao diện (UC17) */
export class UiTranslationRowDto {
  /** Ví dụ `menu.home` */
  key!: string;

  /** Giá trị theo mã ngôn ngữ đang hoạt động, `null` là chưa dịch */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
    example: { vi: 'Trang chủ', en: null },
  })
  values!: Record<string, string | null>;
}
