import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { Paginated } from '../../common/utils/paginate';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminCategoryQueryDto } from './dto/admin-category-query.dto';
import { AdminCategoryDto } from './dto/admin-category-response.dto';
import { SaveCategoryDto } from './dto/save-category.dto';

/** UC15 - Quản lý danh mục (phase 3 doc mục 4.6) */
@ApiTags('Admin / Categories')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(
    private readonly adminCategoriesService: AdminCategoriesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'UC15 - Danh sách danh mục',
    description:
      'Mọi danh mục kèm tên, slug ở mọi ngôn ngữ (ngôn ngữ mặc định đứng đầu) và số bài viết ở mọi trạng thái. `q` tìm trong tên ở mọi ngôn ngữ.',
  })
  @ApiPaginatedResponse(AdminCategoryDto)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Lấy danh sách danh mục thành công')
  list(
    @Query() query: AdminCategoryQueryDto,
  ): Promise<Paginated<AdminCategoryDto>> {
    return this.adminCategoriesService.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'UC15 - Thêm danh mục',
    description:
      'Body `{ names: { vi: "...", en: "" } }`. Tên ngôn ngữ mặc định bắt buộc, 2-150 ký tự. Tên rỗng thì không tạo bản dịch ở ngôn ngữ đó. Slug tự sinh, trùng trong cùng ngôn ngữ thì thêm `-2`. Lỗi ghi field dạng `names.vi`.',
  })
  @ApiDataResponse(AdminCategoryDto, { status: 201 })
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Thêm danh mục thành công')
  create(@Body() dto: SaveCategoryDto): Promise<AdminCategoryDto> {
    return this.adminCategoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'UC15 - Sửa danh mục',
    description:
      'Như POST. Ngôn ngữ không gửi thì giữ nguyên; gửi tên rỗng ở ngôn ngữ không mặc định thì xóa bản dịch đó. Đổi tên thì sinh lại slug.',
  })
  @ApiDataResponse(AdminCategoryDto)
  @ApiErrorResponses(400, 401, 403, 404)
  @ResponseMessage('Cập nhật danh mục thành công')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveCategoryDto,
  ): Promise<AdminCategoryDto> {
    return this.adminCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'UC15 - Xóa danh mục',
    description: 'Danh mục còn bài viết → 409 `CATEGORY_IN_USE`.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(401, 403, 404, 409)
  @ResponseMessage('Đã xóa danh mục.')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<null> {
    await this.adminCategoriesService.remove(id);
    return null;
  }
}
