import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CacheTtl, RedisKeys } from '../../common/utils/redis-keys';
import { RedisService } from '../../infra/redis/redis.service';
import { User } from '../users/models/user.model';

/**
 * Kiểm tra `is_active` ở mỗi request có token, cache 60 giây, để tài khoản vừa bị
 * khóa không dùng tiếp access token cũ (phase 3 doc mục 3.2).
 */
@Injectable()
export class UserStatusService {
  constructor(
    private readonly redis: RedisService,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {}

  /** false nếu tài khoản bị khóa hoặc không còn tồn tại */
  async isActive(userId: number): Promise<boolean> {
    const key = RedisKeys.userActive(userId);
    const cached = await this.redis.client.get(key);
    if (cached !== null) {
      return cached === '1';
    }
    const user = await this.userModel.findByPk(userId, {
      attributes: ['id', 'isActive'],
    });
    const active = Boolean(user?.isActive);
    await this.redis.client.set(
      key,
      active ? '1' : '0',
      'EX',
      CacheTtl.userActive,
    );
    return active;
  }

  /** Gọi khi khóa / mở khóa tài khoản (UC14) để guard thấy ngay */
  async invalidate(userId: number): Promise<void> {
    await this.redis.client.del(RedisKeys.userActive(userId));
  }
}
