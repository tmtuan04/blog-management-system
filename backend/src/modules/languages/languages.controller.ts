import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { LanguageResponseDto } from './dto/language-response.dto';
import { LanguagesService } from './languages.service';

@ApiTags('Languages')
@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'UC09, UC16 - Danh sách ngôn ngữ đang hoạt động',
    description: 'Dùng cho bộ chọn ngôn ngữ ở header. Có cache.',
  })
  @ApiDataResponse(LanguageResponseDto, { isArray: true })
  @ResponseMessage('Lấy danh sách ngôn ngữ thành công')
  findAll(): Promise<LanguageResponseDto[]> {
    return this.languagesService.listPublic();
  }
}
