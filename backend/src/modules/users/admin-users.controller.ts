import {
  Body,
  Controller,
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
import { Paginated } from '../../common/utils/paginate';
import { AdminUsersService } from './admin-users.service';
import { AdminUserDto } from './dto/admin-user-response.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

/** UC14 - Quản lý người dùng (phase 3 doc mục 4.6) */
@ApiTags('Admin / Users')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({
    summary: 'UC14 - Danh sách người dùng',
    description:
      '`q` tìm theo họ tên hoặc email, `role` và `isActive` để lọc. Mới tạo xếp trước. `isSelf` là true ở dòng của chính người đang gọi.',
  })
  @ApiPaginatedResponse(AdminUserDto)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Lấy danh sách người dùng thành công')
  list(
    @Query() query: AdminUserQueryDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<Paginated<AdminUserDto>> {
    return this.adminUsersService.list(query, actor.id);
  }

  @Post()
  @ApiOperation({
    summary: 'UC14 - Tạo tài khoản',
    description:
      'Họ tên, email, mật khẩu theo ràng buộc UC01, kèm vai trò. Email đã có → 409, lỗi ở field `email`.',
  })
  @ApiDataResponse(AdminUserDto, { status: 201 })
  @ApiErrorResponses(400, 401, 403, 409)
  @ResponseMessage('Tạo tài khoản thành công')
  create(
    @Body() dto: CreateAdminUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AdminUserDto> {
    return this.adminUsersService.create(dto, actor.id);
  }

  @Patch(':id/role')
  @ApiOperation({
    summary: 'UC14 - Đổi vai trò',
    description:
      'Tự đổi vai trò của chính mình → 400. Hạ vai trò Super Admin hoạt động cuối cùng → 409 `LAST_SUPER_ADMIN`. Vai trò mới có hiệu lực với access token cấp sau đó; token cũ giữ vai trò cũ tới khi hết hạn (15 phút).',
  })
  @ApiDataResponse(AdminUserDto)
  @ApiErrorResponses(400, 401, 403, 404, 409)
  @ResponseMessage('Đã đổi vai trò')
  changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AdminUserDto> {
    return this.adminUsersService.changeRole(id, dto, actor.id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'UC14 - Khóa hoặc mở khóa tài khoản',
    description:
      'Khóa: thu hồi mọi refresh token, access token đang dùng bị từ chối ngay (403 `ACCOUNT_LOCKED`). Tự khóa mình → 400. Khóa Super Admin hoạt động cuối cùng → 409 `LAST_SUPER_ADMIN`. Không xóa người dùng, chỉ khóa.',
  })
  @ApiDataResponse(AdminUserDto)
  @ApiErrorResponses(400, 401, 403, 404, 409)
  @ResponseMessage('Đã cập nhật trạng thái tài khoản')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AdminUserDto> {
    return this.adminUsersService.changeStatus(id, dto, actor.id);
  }
}
