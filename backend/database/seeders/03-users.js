const bcrypt = require('bcrypt');
const {
  skipInProduction,
  select,
  assertIdsFree,
  seedUuid,
  copySeedImages,
  removeSeedImages,
} = require('../seed-helpers');

const SEEDER = '03-users';
/** Mật khẩu chung của tài khoản mẫu, ghi trong README backend */
const PASSWORD = 'Password123';
const BCRYPT_ROUNDS = 10;
const OWNER1_AVATAR = `uploads/avatars/${seedUuid(2, 2)}.png`;

const USERS = [
  {
    id: 1,
    full_name: 'Super Admin',
    email: 'admin@blog.local',
    avatar: null,
    role: 'super_admin',
    timestamp: '2026-08-01 00:00:00',
  },
  {
    id: 2,
    full_name: 'Nguyễn Văn An',
    email: 'owner1@blog.local',
    avatar: OWNER1_AVATAR,
    role: 'blog_owner',
    timestamp: '2026-08-10 10:15:00',
  },
  {
    id: 3,
    full_name: 'Trần Thị Bình',
    email: 'owner2@blog.local',
    avatar: null,
    role: 'blog_owner',
    timestamp: '2026-08-12 14:20:00',
  },
  // Đăng ký qua Github nên chưa có mật khẩu
  {
    id: 4,
    full_name: 'Lê Minh Cường',
    email: 'user@blog.local',
    avatar: null,
    role: 'user',
    oauthOnly: true,
    timestamp: '2026-08-20 19:45:00',
  },
];

const OAUTH_ACCOUNTS = [
  {
    id: 1,
    user_id: 4,
    provider: 'github',
    provider_user_id: '10293847',
    provider_email: 'user@blog.local',
    created_at: '2026-08-20 19:45:00',
    updated_at: '2026-08-20 19:45:00',
  },
];

const USER_IDS = USERS.map((user) => user.id);

module.exports = {
  /** 1 Super Admin, 2 Blog Owner, 1 User đăng nhập bằng Github */
  async up(queryInterface) {
    if (skipInProduction(SEEDER)) {
      return;
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      const roles = await select(
        queryInterface,
        'SELECT id, code FROM roles WHERE code IN (:codes)',
        { codes: [...new Set(USERS.map((user) => user.role))] },
        transaction,
      );
      const roleIds = Object.fromEntries(roles.map((role) => [role.code, role.id]));
      const missingRoles = USERS.filter((user) => !roleIds[user.role]).map((user) => user.role);
      if (missingRoles.length > 0) {
        throw new Error(`${SEEDER}: thiếu role ${[...new Set(missingRoles)].join(', ')}. Chạy 01-role trước.`);
      }

      await assertIdsFree(queryInterface, 'users', USER_IDS, transaction, SEEDER);
      await assertIdsFree(
        queryInterface,
        'oauth_accounts',
        OAUTH_ACCOUNTS.map((account) => account.id),
        transaction,
        SEEDER,
      );
      const takenEmails = await select(
        queryInterface,
        'SELECT email FROM users WHERE email IN (:emails)',
        { emails: USERS.map((user) => user.email) },
        transaction,
      );
      if (takenEmails.length > 0) {
        throw new Error(
          `${SEEDER}: email ${takenEmails.map((row) => row.email).join(', ')} đã có trong bảng users.`,
        );
      }

      const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
      await queryInterface.bulkInsert(
        'users',
        USERS.map((user) => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          password_hash: user.oauthOnly ? null : passwordHash,
          avatar: user.avatar,
          role_id: roleIds[user.role],
          is_active: true,
          created_at: user.timestamp,
          updated_at: user.timestamp,
        })),
        { transaction },
      );
      await queryInterface.bulkInsert('oauth_accounts', OAUTH_ACCOUNTS, { transaction });

      await copySeedImages([{ source: 'avatar-2.png', path: OWNER1_AVATAR }]);
    });
  },

  async down(queryInterface) {
    if (skipInProduction(SEEDER)) {
      return;
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [posts] = await select(
        queryInterface,
        'SELECT COUNT(*) AS total FROM posts WHERE user_id IN (:ids)',
        { ids: USER_IDS },
        transaction,
      );
      const [comments] = await select(
        queryInterface,
        'SELECT COUNT(*) AS total FROM comments WHERE user_id IN (:ids)',
        { ids: USER_IDS },
        transaction,
      );
      if (Number(posts.total) > 0 || Number(comments.total) > 0) {
        throw new Error(
          `${SEEDER}: tài khoản mẫu vẫn còn ${posts.total} bài viết, ${comments.total} bình luận. ` +
            'Rollback các seeder sau trước.',
        );
      }

      // oauth_accounts xóa theo CASCADE. Lọc cả email để không xóa nhầm tài khoản thật trùng id
      for (const user of USERS) {
        await queryInterface.bulkDelete('users', { id: user.id, email: user.email }, { transaction });
      }
    });
    await removeSeedImages([OWNER1_AVATAR]);
  },
};
