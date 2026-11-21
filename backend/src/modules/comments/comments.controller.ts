import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/request-context';
import type { Paginated } from '../../common/utils/paginate';
import { CommentsService } from './comments.service';
import { CommentQueryDto } from './dto/comment-query.dto';
import { CommentDto, CommentThreadDto } from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

/** UC08 - Bình luận (phase 3 doc mục 4.3) */
@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public({ optionalAuth: true })
  @Get('post-translations/:id/comments')
  @ApiOperation({
    summary: 'UC08 - Danh sách bình luận của bản dịch',
    description:
      'Bình luận gốc mới nhất trước, 20 mỗi trang, mỗi bình luận kèm toàn bộ trả lời (cũ nhất trước). Có token thì `canDelete` tính theo người đang xem. Bản dịch chưa đăng → 404.',
  })
  @ApiPaginatedResponse(CommentThreadDto)
  @ApiErrorResponses(400, 404)
  @ResponseMessage('Lấy danh sách bình luận thành công')
  findAll(
    @Param('id', ParseIntPipe) translationId: number,
    @Query() query: CommentQueryDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<Paginated<CommentThreadDto>> {
    return this.commentsService.list(translationId, query, user);
  }

  @Post('post-translations/:id/comments')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'UC08 - Gửi bình luận hoặc trả lời',
    description:
      '`content` 1-1000 ký tự, văn bản thuần (có thẻ HTML → 400). `parentId` phải là bình luận gốc của cùng bản dịch, chỉ trả lời 1 cấp. Bản dịch chưa đăng → 404.',
  })
  @ApiDataResponse(CommentDto, { status: 201 })
  @ApiErrorResponses(400, 401, 404)
  @ResponseMessage('Gửi bình luận thành công')
  create(
    @Param('id', ParseIntPipe) translationId: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommentDto> {
    return this.commentsService.create(translationId, dto, user);
  }

  @Delete('comments/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'UC08 - Xóa bình luận',
    description:
      'Người viết, tác giả bài hoặc Super Admin. Các trả lời của bình luận cũng bị xóa.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(401, 403, 404)
  @ResponseMessage('Đã xóa bình luận')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<null> {
    await this.commentsService.remove(id, user);
    return null;
  }
}
