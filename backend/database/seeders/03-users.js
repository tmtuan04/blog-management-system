
'use strict';

const bcrypt = require('bcrypt');

const PASSWORD = 'Password123';
const BCRYPT_ROUNDS = 10;

const SEED_TIMESTAMP = {
    admin: '2026-08-01 00:00:00',
    owner1: '2026-08-10 10:15:00',
    owner2: '2026-08-12 14:20:00',
    user: '2026-08-20 19:45:00',
};

const USERS = [
    {
        id: 1,
        full_name: 'Super Admin',
        email: 'admin@blog.local',
        password_hash: null,
        avatar: null,
        role_code: 'super_admin',
        is_active: true,
        timestamp: SEED_TIMESTAMP.admin,
    },
    {
        id: 2,
        full_name: 'Nguyễn Văn An',
        email: 'owner1@blog.local',
        password_hash: null,
        avatar: 'uploads/avatars/2.jpg',
        role_code: 'blog_owner',
        is_active: true,
        timestamp: SEED_TIMESTAMP.owner1,
    },
    {
        id: 3,
        full_name: 'Trần Thị Bình',
        email: 'owner2@blog.local',
        password_hash: null,
        avatar: null,
        role_code: 'blog_owner',
        is_active: true,
        timestamp: SEED_TIMESTAMP.owner2,
    },
    {
        id: 4,
        full_name: 'Lê Minh Cường',
        email: 'user@blog.local',
        password_hash: null,
        avatar: null,
        role_code: 'user',
        is_active: true,
        timestamp: SEED_TIMESTAMP.user,
    },
];

const GITHUB_ACCOUNT = {
    id: 1,
    user_id: 4,
    provider: 'github',
    provider_user_id: '10293847',
    provider_email: 'user@blog.local',
};

module.exports = {
    /**
     * Create 4 sample users and 1 GitHub OAuth account.
     */
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {

            // 1. Get role IDs by role codes.
            const roles = await queryInterface.sequelize.query(
                `
          SELECT id, code
          FROM roles
          WHERE code IN (:roleCodes)
        `,
                {
                    replacements: {
                        roleCodes: ['user', 'blog_owner', 'super_admin'],
                    },
                    type: Sequelize.QueryTypes.SELECT,
                    transaction,
                },
            );

            const roleMap = Object.fromEntries(
                roles.map((role) => [role.code, role.id]),
            );

            // 2. Check required roles.
            const missingRoles = ['user', 'blog_owner', 'super_admin']
                .filter((code) => roleMap[code] === undefined);

            if (missingRoles.length > 0) {
                throw new Error(
                    `Missing roles: ${missingRoles.join(', ')}. Run Seed 01 first.`,
                );
            }

            // 3. Check existing user IDs or emails.
            const userIds = USERS.map((user) => user.id);
            const emails = USERS.map((user) => user.email);

            const existingUsers = await queryInterface.sequelize.query(
                `
          SELECT id, email
          FROM users
          WHERE id IN (:userIds)
             OR email IN (:emails)
        `,
                {
                    replacements: { userIds, emails },
                    type: Sequelize.QueryTypes.SELECT,
                    transaction,
                },
            );

            if (existingUsers.length > 0) {
                throw new Error(
                    'Seed 03 aborted: one or more user IDs or emails already exist. ' +
                    'Check the users table before running this seeder.',
                );
            }

            // 4. Check existing OAuth account.
            const existingOAuth = await queryInterface.sequelize.query(
                `
          SELECT id
          FROM oauth_accounts
          WHERE id = :id
             OR (provider = :provider AND provider_user_id = :providerUserId)
        `,
                {
                    replacements: {
                        id: GITHUB_ACCOUNT.id,
                        provider: GITHUB_ACCOUNT.provider,
                        providerUserId: GITHUB_ACCOUNT.provider_user_id,
                    },
                    type: Sequelize.QueryTypes.SELECT,
                    transaction,
                },
            );

            if (existingOAuth.length > 0) {
                throw new Error(
                    'Seed 03 aborted: the GitHub OAuth account already exists.',
                );
            }

            // 5. Hash passwords for the three email/password accounts.
            const passwordHash = await bcrypt.hash(
                PASSWORD,
                BCRYPT_ROUNDS,
            );

            // 6. Prepare user records.
            const userRecords = USERS.map((user) => ({
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                password_hash:
                    user.role_code === 'user' ? null : passwordHash,
                avatar: user.avatar,
                role_id: roleMap[user.role_code],
                is_active: user.is_active,
                created_at: user.timestamp,
                updated_at: user.timestamp,
            }));

            // 7. Insert users.
            await queryInterface.bulkInsert(
                'users',
                userRecords,
                { transaction },
            );

            // 8. Insert GitHub OAuth account.
            await queryInterface.bulkInsert(
                'oauth_accounts',
                [
                    {
                        id: GITHUB_ACCOUNT.id,
                        user_id: GITHUB_ACCOUNT.user_id,
                        provider: GITHUB_ACCOUNT.provider,
                        provider_user_id: GITHUB_ACCOUNT.provider_user_id,
                        provider_email: GITHUB_ACCOUNT.provider_email,
                        created_at: SEED_TIMESTAMP.user,
                        updated_at: SEED_TIMESTAMP.user,
                    },
                ],
                { transaction },
            );
        });
    },

    /**
     * Rollback sample users and OAuth account.
     */
    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {

            const userIds = USERS.map((user) => user.id);

            // 1. Check whether sample users are referenced by posts.
            const postReferences = await queryInterface.sequelize.query(
                `
          SELECT COUNT(*) AS total
          FROM posts
          WHERE user_id IN (:userIds)
        `,
                {
                    replacements: { userIds },
                    type: Sequelize.QueryTypes.SELECT,
                    transaction,
                },
            );

            // 2. Check whether sample users are referenced by comments.
            const commentReferences = await queryInterface.sequelize.query(
                `
          SELECT COUNT(*) AS total
          FROM comments
          WHERE user_id IN (:userIds)
        `,
                {
                    replacements: { userIds },
                    type: Sequelize.QueryTypes.SELECT,
                    transaction,
                },
            );

            const postsCount = Number(postReferences[0].total);
            const commentsCount = Number(commentReferences[0].total);

            if (postsCount > 0 || commentsCount > 0) {
                throw new Error(
                    'Cannot rollback Seed 03. Sample users are still referenced by ' +
                    `posts: ${postsCount}, comments: ${commentsCount}. ` +
                    'Rollback dependent seeders first.',
                );
            }

            // 3. Delete GitHub OAuth account.
            await queryInterface.bulkDelete(
                'oauth_accounts',
                {
                    id: GITHUB_ACCOUNT.id,
                    user_id: GITHUB_ACCOUNT.user_id,
                    provider: GITHUB_ACCOUNT.provider,
                    provider_user_id: GITHUB_ACCOUNT.provider_user_id,
                },
                { transaction },
            );

            // 4. Delete sample users using both ID and email.
            for (const user of USERS) {
                await queryInterface.bulkDelete(
                    'users',
                    {
                        id: user.id,
                        email: user.email,
                    },
                    { transaction },
                );
            }
        });
    },
};
