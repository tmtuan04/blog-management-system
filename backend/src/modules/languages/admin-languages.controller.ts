import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminLanguagesService } from './admin-languages.service';
import { AdminLanguageDto } from './dto/admin-language-response.dto';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/save-language.dto';

/** UC16 - Quản lý ngôn ngữ (phase 3 doc mục 4.6) */
@ApiTags('Admin / Languages')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/languages')
export class AdminLanguagesController {
  constructor(private readonly adminLanguagesService: AdminLanguagesService) {}

  @Get()
  @ApiOperation({
    summary: 'UC16 - Danh sách ngôn ngữ',
    description:
      'Mọi ngôn ngữ, kể cả đã tắt, kèm số bản dịch bài viết. Ngôn ngữ mặc định đứng đầu.',
  })
  @ApiDataResponse(AdminLanguageDto, { isArray: true })
  @ApiErrorResponses(401, 403)
  @ResponseMessage('Lấy danh sách ngôn ngữ thành công')
  list(): Promise<AdminLanguageDto[]> {
    return this.adminLanguagesService.list();
  }

  @Post()
  @ApiOperation({
    summary: 'UC16 - Thêm ngôn ngữ',
    description:
      '`code` theo ISO 639-1, trùng → 409. Sao chép mọi bản dịch giao diện của ngôn ngữ mặc định sang ngôn ngữ mới trong cùng transaction.',
  })
  @ApiDataResponse(AdminLanguageDto, { status: 201 })
  @ApiErrorResponses(400, 401, 403, 409)
  @ResponseMessage('Thêm ngôn ngữ thành công')
  create(@Body() dto: CreateLanguageDto): Promise<AdminLanguageDto> {
    return this.adminLanguagesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'UC16 - Sửa ngôn ngữ',
    description:
      'Chỉ `name` và `isActive`, không đổi `code`. Tắt ngôn ngữ mặc định → 400.',
  })
  @ApiDataResponse(AdminLanguageDto)
  @ApiErrorResponses(400, 401, 403, 404)
  @ResponseMessage('Cập nhật ngôn ngữ thành công')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLanguageDto,
  ): Promise<AdminLanguageDto> {
    return this.adminLanguagesService.update(id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({
    summary: 'UC16 - Đặt làm ngôn ngữ mặc định',
    description:
      'Ngôn ngữ mặc định cũ tự bỏ mặc định trong cùng transaction. Ngôn ngữ đang tắt → 400.',
  })
  @ApiDataResponse(AdminLanguageDto)
  @ApiErrorResponses(400, 401, 403, 404)
  @ResponseMessage('Đã đặt làm ngôn ngữ mặc định')
  setDefault(@Param('id', ParseIntPipe) id: number): Promise<AdminLanguageDto> {
    return this.adminLanguagesService.setDefault(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'UC16 - Xóa ngôn ngữ',
    description:
      'Ngôn ngữ mặc định → 400. Đang có bản dịch bài viết → 409 `LANGUAGE_IN_USE`. Xóa được thì tên danh mục, bản dịch giao diện, nội dung trang tĩnh của ngôn ngữ đó cũng bị xóa.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(400, 401, 403, 404, 409)
  @ResponseMessage('Đã xóa ngôn ngữ.')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<null> {
    await this.adminLanguagesService.remove(id);
    return null;
  }
}
