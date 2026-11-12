import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { UiTranslationsService } from './ui-translations.service';

@ApiTags('UI Translations')
@Controller('ui-translations')
export class UiTranslationsController {
  constructor(private readonly uiTranslationsService: UiTranslationsService) {}

  @Public()
  @Get(':code')
  @ApiOperation({
    summary: 'UC09, UC17 - Bản dịch giao diện của một ngôn ngữ',
    description:
      'Object `{ key: value }`, key chưa dịch đã được điền sẵn giá trị của ngôn ngữ mặc định. Mã không có hoặc đã tắt → 404. Có cache.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Thành công' },
        data: {
          type: 'object',
          additionalProperties: { type: 'string' },
          example: { 'menu.home': 'Trang chủ', 'menu.about': 'Giới thiệu' },
        },
      },
    },
  })
  @ApiErrorResponses(404)
  @ResponseMessage('Lấy bản dịch giao diện thành công')
  findByCode(@Param('code') code: string): Promise<Record<string, string>> {
    return this.uiTranslationsService.getPublic(code);
  }
}
