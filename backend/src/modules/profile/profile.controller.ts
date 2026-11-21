import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/request-context';
import { UploadResponseDto } from '../../infra/upload/dto/upload-response.dto';
import { toPublicUrl } from '../../infra/upload/upload.controller';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'UC12 - Xem hồ sơ cá nhân',
    description:
      'hasPassword = false (tài khoản OAuth chưa đặt mật khẩu) thì không cần mật khẩu hiện tại khi đổi mật khẩu.',
  })
  @ApiDataResponse(ProfileResponseDto)
  @ApiErrorResponses(401, 403)
  @ResponseMessage('Lấy hồ sơ thành công')
  get(@CurrentUser() user: AuthUser): Promise<ProfileResponseDto> {
    return this.profileService.get(user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'UC12 - Sửa họ tên',
    description: 'Gửi kèm email hoặc role thì 400, không tự đổi được.',
  })
  @ApiDataResponse(ProfileResponseDto)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Đã lưu thay đổi')
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.update(user.id, dto);
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'UC12 - Đổi ảnh đại diện',
    description:
      'JPG, PNG, WEBP, tối đa 2MB. Lưu vào uploads/avatars/, xóa ảnh cũ.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiDataResponse(UploadResponseDto)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Đổi ảnh đại diện thành công')
  async updateAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ): Promise<UploadResponseDto> {
    const path = await this.profileService.updateAvatar(user.id, file);
    return { path, url: toPublicUrl(req, path) };
  }

  @Patch('password')
  @ApiOperation({
    summary: 'UC12 - Đổi mật khẩu',
    description:
      'Đã có mật khẩu thì currentPassword bắt buộc và phải đúng (sai: 400 kèm errors[{ field: currentPassword }]). Thành công thì thu hồi mọi refresh token.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Đổi mật khẩu thành công')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<null> {
    await this.profileService.changePassword(user.id, dto);
    return null;
  }
}
