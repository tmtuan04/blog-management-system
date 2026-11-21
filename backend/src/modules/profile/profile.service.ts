import { HttpStatus, Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { AppException, ErrorCode } from '../../common/errors';
import { CachePrefix } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { UploadService } from '../../infra/upload/upload.service';
import { BCRYPT_COST } from '../auth/auth.service';
import { REQUIRED_MESSAGE } from '../auth/dto/auth-fields';
import { TokenService } from '../auth/token.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export const WRONG_CURRENT_PASSWORD_MESSAGE = 'Mật khẩu hiện tại không đúng.';

const toProfile = (user: User): ProfileResponseDto => ({
  fullName: user.fullName,
  email: user.email,
  avatar: user.avatar ?? null,
  role: user.role!.code,
  hasPassword: Boolean(user.passwordHash),
});

/** UC12 - Hồ sơ cá nhân của người đang đăng nhập */
@Injectable()
export class ProfileService {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly upload: UploadService,
    private readonly cache: CacheService,
  ) {}

  /** GET /profile */
  async get(userId: number): Promise<ProfileResponseDto> {
    return toProfile(await this.findUser(userId));
  }

  /**
   * PATCH /profile. Họ tên hiện trên thẻ bài (`author.fullName`) nên đổi tên thì
   * xóa cache bài viết.
   */
  async update(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = await this.findUser(userId);
    if (user.fullName !== dto.fullName) {
      await this.users.updateProfile(userId, { fullName: dto.fullName });
      user.fullName = dto.fullName;
      await this.cache.invalidate(CachePrefix.posts);
    }
    return toProfile(user);
  }

  /**
   * POST /profile/avatar. Lưu vào uploads/avatars/, cập nhật DB xong mới xóa ảnh
   * cũ (lưu DB lỗi thì xóa ảnh vừa ghi, ảnh cũ vẫn còn). Ảnh hiện trên thẻ bài
   * nên xóa cache bài viết, tránh thẻ trong cache trỏ tới file đã xóa.
   */
  async updateAvatar(
    userId: number,
    file: Express.Multer.File | undefined,
  ): Promise<string> {
    const user = await this.findUser(userId);
    const path = await this.upload.saveImage(file, 'avatars');
    try {
      await this.users.updateProfile(userId, { avatar: path });
    } catch (error) {
      await this.upload.remove(path);
      throw error;
    }
    // Avatar là URL ngoài (OAuth) thì remove() tự bỏ qua
    await this.upload.remove(user.avatar);
    await this.cache.invalidate(CachePrefix.posts);
    return path;
  }

  /**
   * PATCH /profile/password. Đã có mật khẩu thì phải nhập đúng mật khẩu hiện tại;
   * tài khoản OAuth chưa có mật khẩu thì đặt mới luôn. Thành công thì thu hồi mọi
   * refresh token như UC03, các phiên khác phải đăng nhập lại.
   */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findUser(userId);
    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw AppException.validation([
          { field: 'currentPassword', message: REQUIRED_MESSAGE },
        ]);
      }
      if (!(await compare(dto.currentPassword, user.passwordHash))) {
        throw AppException.validation([
          { field: 'currentPassword', message: WRONG_CURRENT_PASSWORD_MESSAGE },
        ]);
      }
    }
    await this.users.updatePassword(
      userId,
      await hash(dto.newPassword, BCRYPT_COST),
    );
    await this.tokens.revokeAll(userId);
  }

  /** Token hợp lệ nhưng tài khoản đã bị xóa thì coi như chưa đăng nhập */
  private async findUser(userId: number): Promise<User> {
    const user = await this.users.findById(userId, { withPassword: true });
    if (!user) {
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED);
    }
    return user;
  }
}
