import { INestApplication } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { MODELS } from '../../src/infra/database/models';
import { RedisService } from '../../src/infra/redis/redis.service';
import { Language } from '../../src/modules/languages/models/language.model';
import { Role } from '../../src/modules/users/models/role.model';

/**
 * Xóa sạch dữ liệu (giữ bảng sequelize_meta) và Redis db test, rồi nạp dữ liệu
 * tối thiểu: 3 role, 2 ngôn ngữ vi (mặc định) và en. Không dùng seeder demo.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const sequelize = app.get(Sequelize);
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const model of MODELS) {
    await sequelize.query(
      `TRUNCATE TABLE \`${model.getTableName() as string}\``,
    );
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  await app.get(RedisService).client.flushdb();

  await Role.bulkCreate([
    { code: 'user', name: 'Người dùng' },
    { code: 'blog_owner', name: 'Blog Owner' },
    { code: 'super_admin', name: 'Super Admin' },
  ]);
  await Language.bulkCreate([
    { code: 'vi', name: 'Tiếng Việt', isDefault: true, isActive: true },
    { code: 'en', name: 'English', isDefault: false, isActive: true },
  ]);
}

/** Xóa cache sau khi sửa dữ liệu trực tiếp trong test */
export async function flushRedis(app: INestApplication): Promise<void> {
  await app.get(RedisService).client.flushdb();
}
