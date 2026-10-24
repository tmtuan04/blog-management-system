import { Body, Controller, Get, HttpCode, Ip, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/request-context';
import { AuthService } from './auth.service';
import {
  AuthUserDto,
  LoginResponseDto,
  TokenPairDto,
} from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'UC01 - Đăng ký',
    description: 'Tài khoản mới có role user.',
  })
  @ApiDataResponse(AuthUserDto, { status: 201 })
  @ApiErrorResponses(400, 409)
  @ResponseMessage('Đăng ký thành công. Đăng nhập để bắt đầu.')
  register(@Body() dto: RegisterDto): Promise<AuthUserDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'UC02 - Đăng nhập',
    description:
      'Sai email hoặc mật khẩu: 401 INVALID_CREDENTIALS. Tài khoản bị khóa: 403 ACCOUNT_LOCKED. Sai quá 5 lần / 15 phút theo IP + email: 429.',
  })
  @ApiDataResponse(LoginResponseDto)
  @ApiErrorResponses(400, 401, 403, 429)
  @ResponseMessage('Đăng nhập thành công')
  login(@Body() dto: LoginDto, @Ip() ip: string): Promise<LoginResponseDto> {
    return this.authService.login(dto, ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'UC02 - Làm mới token',
    description:
      'Xoay vòng: refresh token cũ bị thu hồi, trả cặp token mới. Sai hoặc hết hạn: 401 TOKEN_EXPIRED.',
  })
  @ApiDataResponse(TokenPairDto)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Làm mới phiên đăng nhập thành công')
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'UC04 - Đăng xuất',
    description: 'Thu hồi refresh token của phiên hiện tại.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(400, 401)
  @ResponseMessage('Đăng xuất thành công')
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: AuthUser,
  ): Promise<null> {
    await this.authService.logout(dto.refreshToken, user.id);
    return null;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: FIFTEEN_MINUTES } })
  @ApiOperation({
    summary: 'UC03 - Quên mật khẩu',
    description:
      'Luôn trả cùng một message. Email có tồn tại thì gửi link đặt lại mật khẩu (hạn 15 phút). Tối đa 3 lần / 15 phút / IP.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(400)
  @ApiTooManyRequestsResponse({ description: 'Quá 3 lần / 15 phút' })
  @ResponseMessage(
    'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu',
  )
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<null> {
    await this.authService.forgotPassword(dto.email);
    return null;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'UC03 - Đặt lại mật khẩu',
    description:
      'Token sai hoặc hết hạn: 400 RESET_TOKEN_INVALID. Thành công thì đăng xuất mọi thiết bị.',
  })
  @ApiDataResponse(null)
  @ApiErrorResponses(400)
  @ResponseMessage('Đặt lại mật khẩu thành công. Đăng nhập bằng mật khẩu mới.')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<null> {
    await this.authService.resetPassword(dto);
    return null;
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'UC02 - Người đang đăng nhập',
    description: 'Thông tin user + role để frontend hiện menu theo role.',
  })
  @ApiDataResponse(AuthUserDto)
  @ApiErrorResponses(401, 403)
  @ResponseMessage('Lấy thông tin tài khoản thành công')
  me(@CurrentUser() user: AuthUser): Promise<AuthUserDto> {
    return this.authService.me(user.id);
  }
}
