import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateUiTranslationDto,
  UpdateUiTranslationValueDto,
} from './dto/save-ui-translation.dto';
import { UiTranslationQueryDto } from './dto/ui-translation-query.dto';
import { UiTranslationRowDto } from './dto/ui-translation-response.dto';
import { UiTranslationsService } from './ui-translations.service';

/** UC17 - Quản lý bản dịch giao diện (phase 3 doc mục 4.6) */
@ApiTags('Admin / UI Translations')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/ui-translations')
export class AdminUiTranslationsController {
  constructor(private readonly uiTranslationsService: UiTranslationsService) {}

  @Get()
  @ApiOperation({
    summary: 'UC17 - Danh sách bản dịch giao diện',
    description:
      'Mỗi dòng một key, `values` theo mã ngôn ngữ đang hoạt động (`null` là chưa dịch). `?q=` tìm theo key hoặc giá trị. Phân trang theo key, mặc định 50.',
  })
  @ApiPaginatedResponse(UiTranslationRowDto)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Lấy danh sách bản dịch giao diện thành công')
  list(@Query() query: UiTranslationQueryDto) {
    return this.uiTranslationsService.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'UC17 - Thêm key',
    description:
      '`key` dạng `nhom.ten`, trùng → 409. Giá trị của ngôn ngữ mặc định bắt buộc, ngôn ngữ khác để trống được.',
  })
  @ApiDataResponse(UiTranslationRowDto, { status: 201 })
  @ApiErrorResponses(400, 401, 403, 409)
  @ResponseMessage('Thêm key thành công')
  create(@Body() dto: CreateUiTranslationDto): Promise<UiTranslationRowDto> {
    return this.uiTranslationsService.create(dto);
  }

  @Put(':key/:code')
  @ApiOperation({
    summary: 'UC17 - Sửa giá trị một ô',
    description:
      'Sửa giá trị của `key` ở ngôn ngữ `code`. Giá trị rỗng ở ngôn ngữ không mặc định thì xóa ô đó (giao diện dùng giá trị mặc định); rỗng ở ngôn ngữ mặc định → 400.',
  })
  @ApiDataResponse(UiTranslationRowDto)
  @ApiErrorResponses(400, 401, 403, 404)
  @ResponseMessage('Đã lưu bản dịch.')
  updateValue(
    @Param('key') key: string,
    @Param('code') code: string,
    @Body() dto: UpdateUiTranslationValueDto,
  ): Promise<UiTranslationRowDto> {
    return this.uiTranslationsService.updateValue(key, code, dto);
  }

  @Delete(':key')
  @ApiOperation({
    summary: 'UC17 - Xóa key',
    description: 'Xóa giá trị của key ở mọi ngôn ngữ.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(401, 403, 404)
  @ResponseMessage('Đã xóa key.')
  async remove(@Param('key') key: string): Promise<null> {
    await this.uiTranslationsService.remove(key);
    return null;
  }
}
