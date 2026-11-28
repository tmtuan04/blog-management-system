import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminPagesService } from './admin-pages.service';
import {
  AdminPageDto,
  AdminPageListItemDto,
} from './dto/admin-page-response.dto';
import { SavePageDto } from './dto/save-page.dto';

/** UC18 - Quản lý trang tĩnh (phase 3 doc mục 4.6) */
@ApiTags('Admin / Pages')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/pages')
export class AdminPagesController {
  constructor(private readonly adminPagesService: AdminPagesService) {}

  @Get()
  @ApiOperation({
    summary: 'UC18 - Danh sách trang tĩnh',
    description:
      'Mọi trang kể cả đang ẩn: `key`, tiêu đề theo ngôn ngữ mặc định, `languages` (mã các ngôn ngữ đang hoạt động đã có nội dung), `isVisible`, `updatedAt`. Không phân trang.',
  })
  @ApiDataResponse(AdminPageListItemDto, { isArray: true })
  @ApiErrorResponses(401, 403)
  @ResponseMessage('Lấy danh sách trang tĩnh thành công')
  list(): Promise<AdminPageListItemDto[]> {
    return this.adminPagesService.list();
  }

  @Get(':key')
  @ApiOperation({
    summary: 'UC18 - Chi tiết trang tĩnh để sửa',
    description:
      '`isVisible` và nội dung của từng ngôn ngữ đang hoạt động (mỗi ngôn ngữ một tab, chưa có nội dung thì `title` và `content` là chuỗi rỗng).',
  })
  @ApiDataResponse(AdminPageDto)
  @ApiErrorResponses(401, 403, 404)
  @ResponseMessage('Lấy trang tĩnh thành công')
  findByKey(@Param('key') key: string): Promise<AdminPageDto> {
    return this.adminPagesService.findByKey(key);
  }

  @Put(':key')
  @ApiOperation({
    summary: 'UC18 - Lưu trang tĩnh',
    description:
      'Lưu `isVisible` và mọi tab trong một transaction. Ngôn ngữ mặc định bắt buộc có tiêu đề (2-255 ký tự) và nội dung. Ngôn ngữ khác: điền đủ cả hai, hoặc để trống cả hai thì xóa bản dịch (trang public dùng bản mặc định). Nội dung được lọc XSS. Lỗi ghi field dạng `translations.en.title`.',
  })
  @ApiDataResponse(AdminPageDto)
  @ApiErrorResponses(400, 401, 403, 404)
  @ResponseMessage('Lưu trang tĩnh thành công')
  save(
    @Param('key') key: string,
    @Body() dto: SavePageDto,
  ): Promise<AdminPageDto> {
    return this.adminPagesService.save(key, dto);
  }
}
