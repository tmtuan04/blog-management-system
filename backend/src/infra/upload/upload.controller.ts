import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadResponseDto } from './dto/upload-response.dto';
import { UploadService } from './upload.service';

/** URL đầy đủ của file đã upload, theo host của request */
export function toPublicUrl(req: Request, path: string): string {
  return `${req.protocol}://${req.get('host')}/${path}`;
}

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('images')
  @HttpCode(HttpStatus.CREATED)
  @Roles('blog_owner')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'UC13, UC18 - Upload ảnh (thumbnail, ảnh trong editor)',
    description: 'JPG, PNG, WEBP, tối đa 2MB. Trả đường dẫn để lưu vào bài.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiDataResponse(UploadResponseDto, { status: 201 })
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Tải ảnh lên thành công')
  async uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ): Promise<UploadResponseDto> {
    const path = await this.uploadService.saveImage(file, 'images');
    return { path, url: toPublicUrl(req, path) };
  }
}
