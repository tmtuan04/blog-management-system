import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ApiErrorResponses,
  ApiPaginatedResponse,
} from '../../common/decorators/api-response.decorator';
import { CurrentLanguage } from '../../common/decorators/current-language.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { RequestLanguage } from '../../common/types/request-context';
import type { Paginated } from '../../common/utils/paginate';

import { PublicPostCardDto } from './dto/public-post-response.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsService } from './posts.service';

@ApiTags('Posts - Public')
@Controller('search')
export class SearchController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'UC19 - Tìm kiếm toàn văn',
    description:
      'Tìm trong tiêu đề, tóm tắt, nội dung của bản dịch published ở ngôn ngữ đang chọn bằng FULLTEXT `ngram`, liên quan nhất trước, có phân trang. Từ khóa 2-100 ký tự sau khi trim. Không cache.',
  })
  @ApiPaginatedResponse(PublicPostCardDto)
  @ApiErrorResponses(400)
  @ResponseMessage('Tìm kiếm bài viết thành công')
  search(
    @CurrentLanguage() language: RequestLanguage,
    @Query() query: SearchQueryDto,
  ): Promise<Paginated<PublicPostCardDto>> {
    return this.postsService.search(language, query.q, query.page, query.limit);
  }
}
