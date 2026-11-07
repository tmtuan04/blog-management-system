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
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';

/** UC13 - Quản lý bài viết và bản dịch (phase 3 doc mục 4.5) */
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
    summary: 'UC13 - Tạo bài viết, bản gốc và các bản dịch',
    description:
      'Tạo bài + bản gốc + `translations[]` (không bắt buộc) trong một transaction. Mọi ngôn ngữ phải đang hoạt động, bản dịch khác ngôn ngữ gốc và không trùng nhau.',
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

  @Post(':id/translations')
  @ApiOperation({
    summary: 'UC13 - Thêm bản dịch',
    description:
      'Ngôn ngữ phải đang hoạt động. Bài đã có bản dịch ở ngôn ngữ đó → 409.',
  })
  @ApiDataResponse(AdminPostDetailDto, { status: 201 })
  @ApiErrorResponses(400, 401, 403, 404, 409)
  @ResponseMessage('Thêm bản dịch thành công')
  addTranslation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTranslationDto,
  ): Promise<AdminPostDetailDto> {
    return this.adminPostsService.addTranslation(user.id, id, dto);
  }

  @Patch(':id/translations/:code')
  @ApiOperation({
    summary: 'UC13 - Sửa bản dịch',
    description:
      'Trường không gửi thì giữ nguyên. Đổi tiêu đề thì sinh lại slug. `publishedAt` chỉ ghi lần đầu chuyển sang `published`.',
  })
  @ApiDataResponse(AdminPostDetailDto)
  @ApiErrorResponses(400, 401, 403, 404)
  @ResponseMessage('Cập nhật bản dịch thành công')
  updateTranslation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('code') code: string,
    @Body() dto: UpdateTranslationDto,
  ): Promise<AdminPostDetailDto> {
    return this.adminPostsService.updateTranslation(user.id, id, code, dto);
  }

  @Delete(':id/translations/:code')
  @ApiOperation({
    summary: 'UC13 - Xóa bản dịch',
    description:
      'Xóa bản dịch và bình luận của nó. Bản gốc → 400 `ORIGINAL_TRANSLATION_REQUIRED`.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(400, 401, 403, 404)
  @ResponseMessage('Đã xóa bản dịch.')
  async removeTranslation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('code') code: string,
  ): Promise<null> {
    await this.adminPostsService.removeTranslation(user.id, id, code);
    return null;
  }
}
