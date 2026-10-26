// Cấu hình cho sequelize-cli (migrations, seeders). App NestJS đọc config ở src/config/.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const env = process.env;

const base = {
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  dialect: 'mysql',
  timezone: '+00:00',
  dialectOptions: { charset: 'utf8mb4' },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    underscored: true,
  },
  logging: false,
  migrationStorageTableName: 'sequelize_meta',
  // Lưu seeder đã chạy để db:seed:undo chạy đúng thứ tự
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_data',
};

module.exports = {
  development: { ...base, database: env.DB_NAME || 'blog_dev' },
  test: { ...base, database: env.DB_TEST_NAME || 'blog_test' },
  production: { ...base, database: env.DB_NAME },
};
