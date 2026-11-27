import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '../../common/decorators/api-response.decorator';
import { CurrentLanguage } from '../../common/decorators/current-language.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { RequestLanguage } from '../../common/types/request-context';
import {
  PublicPageDto,
  PublicPageLinkDto,
} from './dto/public-page-response.dto';
import { PagesService } from './pages.service';

/** UC11 - Xem trang tĩnh (phase 3 doc mục 4.2) */
@ApiTags('Pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'UC11 - Danh sách trang tĩnh đang hiển thị',
    description:
      'Dùng cho link ở footer và menu. Tiêu đề theo ngôn ngữ đang chọn, thiếu thì dùng ngôn ngữ mặc định. Trang đang ẩn không có trong danh sách.',
  })
  @ApiDataResponse(PublicPageLinkDto, { isArray: true })
  @ResponseMessage('Lấy danh sách trang thành công')
  list(@CurrentLanguage() language: RequestLanguage) {
    return this.pagesService.list(language);
  }

  @Public()
  @Get(':key')
  @ApiOperation({
    summary: 'UC11 - Xem một trang tĩnh',
    description:
      'Tiêu đề và nội dung theo ngôn ngữ đang chọn, thiếu thì dùng ngôn ngữ mặc định. Trang đang ẩn hoặc key không có → 404.',
  })
  @ApiDataResponse(PublicPageDto)
  @ApiErrorResponses(404)
  @ResponseMessage('Lấy trang thành công')
  findByKey(
    @Param('key') key: string,
    @CurrentLanguage() language: RequestLanguage,
  ): Promise<PublicPageDto> {
    return this.pagesService.findByKey(key, language);
  }
}
