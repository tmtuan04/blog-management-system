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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/request-context';
import { AdminPostsService } from './admin-posts.service';
import { AdminPostQueryDto } from './dto/admin-post-query.dto';
import {
  AdminPostDetailDto,
  AdminPostListItemDto,
} from './dto/admin-post-response.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

/**
 * UC13 - Quản lý bài viết (phase 3 doc mục 4.5).
 * PR này: bài + bản gốc. API bản dịch thêm ở PR sau.
 */
@ApiTags('Admin / Posts')
@ApiBearerAuth()
@Roles('blog_owner')
@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly adminPostsService: AdminPostsService) {}

  @Get()
  @ApiOperation({
    summary: 'UC13 - Danh sách bài viết của tôi',
    description:
      'Lọc theo trạng thái bản gốc, ngôn ngữ có bản dịch, danh mục, tìm tiêu đề. Phân trang.',
  })
  @ApiPaginatedResponse(AdminPostListItemDto)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Lấy danh sách bài viết thành công')
  list(@CurrentUser() user: AuthUser, @Query() query: AdminPostQueryDto) {
    return this.adminPostsService.list(user.id, query);
  }

  @Post()
  @ApiOperation({
    summary: 'UC13 - Tạo bài viết và bản gốc',
    description:
      'Tạo bài + bản gốc trong một transaction. Ngôn ngữ gốc phải đang hoạt động.',
  })
  @ApiDataResponse(AdminPostDetailDto, { status: 201 })
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Tạo bài viết thành công')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePostDto,
  ): Promise<AdminPostDetailDto> {
    return this.adminPostsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'UC13 - Chi tiết bài viết (màn sửa)',
    description:
      'Phần dùng chung + mọi bản dịch (kể cả ngôn ngữ đã tắt). Bài của người khác → 403.',
  })
  @ApiDataResponse(AdminPostDetailDto)
  @ApiErrorResponses(401, 403, 404)
  @ResponseMessage('Lấy chi tiết bài viết thành công')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminPostDetailDto> {
    return this.adminPostsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'UC13 - Sửa phần dùng chung',
    description:
      'Chỉ `categoryId` và `thumbnail` (`null` = bỏ ảnh). Không đổi ngôn ngữ gốc.',
  })
  @ApiDataResponse(AdminPostDetailDto)
  @ApiErrorResponses(400, 401, 403, 404)
  @ResponseMessage('Cập nhật bài viết thành công')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ): Promise<AdminPostDetailDto> {
    return this.adminPostsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'UC13 - Xóa bài viết',
    description:
      'Xóa bài, mọi bản dịch, bình luận (cascade) và file thumbnail.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(401, 403, 404)
  @ResponseMessage('Đã xóa bài viết.')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<null> {
    await this.adminPostsService.remove(user.id, id);
    return null;
  }
}
