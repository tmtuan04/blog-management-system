import { Controller, Get, Ip, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from '../../common/decorators/api-response.decorator';
import { CurrentLanguage } from '../../common/decorators/current-language.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type {
  AuthUser,
  RequestLanguage,
} from '../../common/types/request-context';
import type { Paginated } from '../../common/utils/paginate';

import { PopularPostsQueryDto } from './dto/popular-posts-query.dto';
import { PublicPostDetailDto } from './dto/public-post-detail-response.dto';
import { PublicPostCardDto } from './dto/public-post-response.dto';
import { PostsService } from './posts.service';

@ApiTags('Posts - Public')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // Khai báo trước `GET /posts/:slug` để `popular` không bị hiểu là slug
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

  @Public()
  @Get(':slug/related')
  @ApiOperation({
    summary: 'UC06 - Bài viết cùng danh mục',
    description:
      'Tối đa 4 bài cùng danh mục, có bản dịch published ở ngôn ngữ đang chọn, bỏ bài đang xem, mới nhất trước.',
  })
  @ApiDataResponse(PublicPostCardDto, { isArray: true })
  @ApiErrorResponses(404)
  @ResponseMessage('Lấy bài viết cùng danh mục thành công')
  findRelated(
    @CurrentLanguage() language: RequestLanguage,
    @Param('slug') slug: string,
  ): Promise<PublicPostCardDto[]> {
    return this.postsService.findRelated(language, slug);
  }

  @Public({ optionalAuth: true })
  @Get(':slug')
  @ApiOperation({
    summary: 'UC06 - Chi tiết bài viết',
    description:
      'Bản dịch published có slug này ở ngôn ngữ đang chọn. Mỗi IP chỉ tăng lượt xem một lần trong 1 giờ cho mỗi bản dịch. Có token thì tính `canDeleteComments`.',
  })
  @ApiDataResponse(PublicPostDetailDto)
  @ApiErrorResponses(404)
  @ResponseMessage('Lấy chi tiết bài viết thành công')
  findOne(
    @CurrentLanguage() language: RequestLanguage,
    @Param('slug') slug: string,
    @Ip() ip: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<PublicPostDetailDto> {
    return this.postsService.findBySlug(language, slug, ip, user);
  }
}
