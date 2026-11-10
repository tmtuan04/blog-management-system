import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentLanguage } from '../../common/decorators/current-language.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { RequestLanguage } from '../../common/types/request-context';

import { PopularPostsQueryDto } from './dto/popular-posts-query.dto';
import { PostsService } from './posts.service';
import type { PaginatedPostsResult, PublicPostCard } from './posts.service';

@ApiTags('Posts - Public')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // UC05 - GET /api/v1/posts/popular
  @Public()
  @Get('popular')
  @ApiOperation({
    summary: 'UC05 - Lấy danh sách bài viết phổ biến',
    description:
      'Lấy bài viết đã xuất bản theo lượt xem giảm dần. Có Redis cache.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 5,
    description: 'Số bài viết (1-10), mặc định 5',
  })
  @ApiOkResponse({
    description: 'Lấy danh sách bài viết phổ biến thành công',
  })
  @ApiBadRequestResponse({
    description: 'Tham số limit không hợp lệ',
  })
  @ResponseMessage('Lấy bài viết phổ biến thành công')
  findPopular(
    @CurrentLanguage() language: RequestLanguage,
    @Query() query: PopularPostsQueryDto,
  ): Promise<PublicPostCard[]> {
    return this.postsService.findPopular(language, query.limit);
  }

  // UC05 - GET /api/v1/posts
  @Public()
  @Get()
  @ApiOperation({
    summary: 'UC05 - Lấy danh sách bài viết trang chủ',
    description:
      'Chỉ lấy các bản dịch đã xuất bản theo ngôn ngữ hiện tại, sắp xếp mới nhất trước và có phân trang.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiOkResponse({
    description: 'Lấy danh sách bài viết thành công',
  })
  @ApiBadRequestResponse({
    description: 'Tham số phân trang không hợp lệ',
  })
  @ResponseMessage('Lấy danh sách bài viết thành công')
  findAll(
    @CurrentLanguage() language: RequestLanguage,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedPostsResult> {
    return this.postsService.findAll(language, query.page, query.limit);
  }
}
