import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

/** Cache JSON trong Redis (phase 3 doc mục 3.5) */
@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.client.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length) {
      await this.redis.client.del(...keys);
    }
  }

  /** Có cache thì trả cache, không thì gọi `load` rồi lưu lại */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await load();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Xóa mọi key bắt đầu bằng `prefix`, ví dụ `invalidate('cache:posts:')`.
   * Dùng SCAN theo từng đợt, không dùng KEYS để không chặn Redis.
   */
  async invalidate(prefix: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis.client.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        200,
      );
      cursor = next;
      if (keys.length) {
        deleted += await this.redis.client.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }
}
