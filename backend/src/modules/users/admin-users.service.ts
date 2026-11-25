import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { hash } from 'bcrypt';
import {
  Op,
  Transaction,
  UniqueConstraintError,
  WhereOptions,
} from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AppException, ErrorCode } from '../../common/errors';
import { escapeLike } from '../../common/utils/sql';
import { paginate, Paginated, toOffset } from '../../common/utils/paginate';
import { BCRYPT_COST } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';
import { UserStatusService } from '../auth/user-status.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminUserDto } from './dto/admin-user-response.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { Role } from './models/role.model';
import { User } from './models/user.model';
import { UsersService } from './users.service';

const EMAIL_TAKEN = 'Email này đã được đăng ký.';

/**
 * UC14 - Quản lý người dùng (phase 3 doc mục 4.6). Không xóa cứng người dùng, chỉ khóa.
 * Route này không đổi họ tên hay avatar nên không đụng tới cache response bài viết.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Role) private readonly roleModel: typeof Role,
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly userStatus: UserStatusService,
    private readonly sequelize: Sequelize,
  ) {}

  /** GET /admin/users */
  async list(
    query: AdminUserQueryDto,
    actorId: number,
  ): Promise<Paginated<AdminUserDto>> {
    const where: WhereOptions<User> = {};
    if (query.q) {
      const pattern = `%${escapeLike(query.q)}%`;
      Object.assign(where, {
        [Op.or]: [
          { fullName: { [Op.like]: pattern } },
          { email: { [Op.like]: pattern } },
        ],
      });
    }
    if (query.isActive !== undefined) {
      Object.assign(where, { isActive: query.isActive });
    }

    // Một câu có JOIN roles, không gọi thêm câu nào cho từng dòng
    const { rows, count } = await this.userModel.findAndCountAll({
      where,
      include: [
        {
          model: Role,
          required: Boolean(query.role),
          ...(query.role ? { where: { code: query.role } } : {}),
        },
      ],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      ...toOffset(query),
    });
    return paginate(
      rows.map((user) => this.toDto(user, actorId)),
      count,
      query,
    );
  }

  /** POST /admin/users */
  async create(
    dto: CreateAdminUserDto,
    actorId: number,
  ): Promise<AdminUserDto> {
    if (await this.users.emailExists(dto.email)) {
      throw this.emailTaken();
    }
    try {
      const user = await this.users.create({
        fullName: dto.fullName,
        email: dto.email,
        passwordHash: await hash(dto.password, BCRYPT_COST),
        role: dto.role,
      });
      return this.toDto(user, actorId);
    } catch (error) {
      // Hai request cùng email chạy song song: ràng buộc UNIQUE của DB chặn request sau
      if (error instanceof UniqueConstraintError) {
        throw this.emailTaken();
      }
      throw error;
    }
  }

  /** PATCH /admin/users/:id/role */
  async changeRole(
    id: number,
    dto: UpdateUserRoleDto,
    actorId: number,
  ): Promise<AdminUserDto> {
    const user = await this.sequelize.transaction(async (transaction) => {
      const target = await this.findOrFail(id, transaction);
      if (target.role!.code === dto.role) {
        return target;
      }
      if (target.id === actorId) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.BAD_REQUEST,
          'Không thể tự hạ quyền chính mình',
        );
      }
      if (target.role!.code === 'super_admin') {
        await this.assertNotLastSuperAdmin(target, transaction);
      }
      const role = await this.roleModel.findOne({
        where: { code: dto.role },
        transaction,
      });
      if (!role) {
        throw new Error(`Chưa có role ${dto.role}, cần chạy seeder 01-roles`);
      }
      await target.update({ roleId: role.id }, { transaction });
      target.role = role;
      return target;
    });
    return this.toDto(user, actorId);
  }

  /**
   * PATCH /admin/users/:id/status. Khóa thì thu hồi mọi refresh token và xóa cache
   * `is_active` để access token cũ bị từ chối ngay. Bước Redis chạy sau khi DB đã ghi và
   * không nuốt lỗi: nếu Redis lỗi thì gọi lại route này (khóa lại) để thu hồi tiếp.
   */
  async changeStatus(
    id: number,
    dto: UpdateUserStatusDto,
    actorId: number,
  ): Promise<AdminUserDto> {
    const user = await this.sequelize.transaction(async (transaction) => {
      const target = await this.findOrFail(id, transaction);
      if (target.isActive === dto.isActive) {
        return target;
      }
      if (!dto.isActive) {
        if (target.id === actorId) {
          throw new AppException(
            HttpStatus.BAD_REQUEST,
            ErrorCode.BAD_REQUEST,
            'Không thể tự khóa tài khoản của chính mình',
          );
        }
        if (target.role!.code === 'super_admin') {
          await this.assertNotLastSuperAdmin(target, transaction);
        }
      }
      await target.update({ isActive: dto.isActive }, { transaction });
      return target;
    });

    if (!dto.isActive) {
      await this.tokens.revokeAll(user.id);
    }
    await this.userStatus.invalidate(user.id);
    return this.toDto(user, actorId);
  }

  /**
   * Hệ thống luôn phải còn ít nhất 1 Super Admin đang hoạt động. Gọi khi `target` là
   * Super Admin sắp bị hạ quyền hoặc khóa.
   *
   * Khóa dòng `roles` của super_admin trước để các request này xếp hàng: request sau
   * chờ request trước commit rồi mới đếm. Nếu chỉ khóa các dòng `users`, hai Super Admin
   * hạ quyền nhau cùng lúc sẽ deadlock trên index `role_id` (khóa khoảng của
   * `FOR UPDATE` chặn `UPDATE role_id` của bên kia), MySQL hủy một bên và trả 500.
   * Câu đếm vẫn phải đọc có khóa để thấy bản đã commit, không phải snapshot cũ.
   */
  private async assertNotLastSuperAdmin(
    target: User,
    transaction: Transaction,
  ): Promise<void> {
    if (!target.isActive) {
      return; // Super Admin đã bị khóa không tính vào số còn lại
    }
    await this.roleModel.findOne({
      attributes: ['id'],
      where: { id: target.roleId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const active = await this.userModel.findAll({
      attributes: ['id'],
      where: { roleId: target.roleId, isActive: true },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (active.length <= 1) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.LAST_SUPER_ADMIN,
        'Hệ thống phải còn ít nhất một Super Admin đang hoạt động',
      );
    }
  }

  private async findOrFail(
    id: number,
    transaction: Transaction,
  ): Promise<User> {
    const user = await this.userModel.findByPk(id, {
      include: [Role],
      transaction,
    });
    if (!user) {
      throw AppException.notFound('Không tìm thấy người dùng');
    }
    return user;
  }

  private emailTaken(): AppException {
    return new AppException(
      HttpStatus.CONFLICT,
      ErrorCode.CONFLICT,
      EMAIL_TAKEN,
      [{ field: 'email', message: EMAIL_TAKEN }],
    );
  }

  private toDto(user: User, actorId: number): AdminUserDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      // Bản ghi vừa tạo không có avatar trong dataValues (undefined), JSON sẽ mất key
      avatar: user.avatar ?? null,
      role: user.role!.code,
      isActive: user.isActive,
      isSelf: user.id === actorId,
      createdAt: user.createdAt,
    };
  }
}
