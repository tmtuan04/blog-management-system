import { Controller, Get, Param, Query } from '@nestjs/common';
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

import { PublicPostCardDto } from '../posts/dto/public-post-response.dto';

import {
  PublicCategoryDto,
  PublicCategoryDetailDto,
} from './dto/public-category-response.dto';
import { CategoriesService } from './categories.service';

@ApiTags('Categories - Public')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'UC07 - Danh sách danh mục công khai',
  })
  @ApiDataResponse(PublicCategoryDto, { isArray: true })
  @ResponseMessage('Lấy danh sách danh mục thành công')
  findAll(
    @CurrentLanguage() language: RequestLanguage,
  ): Promise<PublicCategoryDto[]> {
    return this.categoriesService.findAll(language);
  }

  @Public()
  @Get(':slug/posts')
  @ApiOperation({
    summary: 'UC07 - Bài viết theo danh mục',
  })
  @ApiPaginatedResponse(PublicPostCardDto)
  @ApiErrorResponses(400, 404)
  @ResponseMessage('Lấy bài viết theo danh mục thành công')
  findPosts(
    @CurrentLanguage() language: RequestLanguage,
    @Param('slug') slug: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<PublicPostCardDto>> {
    return this.categoriesService.findPosts(
      language,
      slug,
      query.page,
      query.limit,
    );
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'UC07 - Chi tiết danh mục',
  })
  @ApiDataResponse(PublicCategoryDetailDto)
  @ApiErrorResponses(404)
  @ResponseMessage('Lấy chi tiết danh mục thành công')
  findBySlug(
    @CurrentLanguage() language: RequestLanguage,
    @Param('slug') slug: string,
  ): Promise<PublicCategoryDetailDto> {
    return this.categoriesService.findBySlug(language, slug);
  }
}
