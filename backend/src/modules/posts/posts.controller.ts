import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from '../../common/decorators/api-response.decorator';
import { CurrentLanguage } from '../../common/decorators/current-language.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { RequestLanguage } from '../../common/types/request-context';
import type { Paginated } from '../../common/utils/paginate';

import { PopularPostsQueryDto } from './dto/popular-posts-query.dto';
import { PublicPostCardDto } from './dto/public-post-response.dto';
import { PostsService } from './posts.service';

@ApiTags('Posts - Public')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // Khai báo trước `GET /posts/:slug` (A4) để `popular` không bị hiểu là slug
  @Public()
  @Get('popular')
  @ApiOperation({
    summary: 'UC05 - Bài viết đọc nhiều',
    description:
      'Bản dịch published ở ngôn ngữ đang chọn, theo lượt xem giảm dần. Có cache.',
  })
  @ApiDataResponse(PublicPostCardDto, { isArray: true })
  @ApiErrorResponses(400)
  @ResponseMessage('Lấy bài viết phổ biến thành công')
  findPopular(
    @CurrentLanguage() language: RequestLanguage,
    @Query() query: PopularPostsQueryDto,
  ): Promise<PublicPostCardDto[]> {
    return this.postsService.findPopular(language, query.limit);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'UC05 - Danh sách bài viết trang chủ',
    description:
      'Bản dịch published ở ngôn ngữ đang chọn, mới nhất trước, có phân trang. Có cache.',
  })
  @ApiPaginatedResponse(PublicPostCardDto)
  @ApiErrorResponses(400)
  @ResponseMessage('Lấy danh sách bài viết thành công')
  findAll(
    @CurrentLanguage() language: RequestLanguage,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<PublicPostCardDto>> {
    return this.postsService.findAll(language, query.page, query.limit);
  }
}
