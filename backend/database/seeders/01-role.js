
const ROLE_SEED_DATA = [
  { id: 1, code: 'user', name: 'Người dùng' },
  { id: 2, code: 'blog_owner', name: 'Blog Owner' },
  { id: 3, code: 'super_admin', name: 'Super Admin' },
];

const ROLE_CODES = ROLE_SEED_DATA.map((role) => role.code);
const SEED_TIMESTAMP = '2026-08-01 00:00:00';

module.exports = {
  /**
   * Create the three fixed system roles.
   *
   * The roles table is intended to be populated by this seeder only.
   * To avoid taking ownership of pre-existing records, fail when one of
   * these role codes already exists instead of silently overwriting it.
   */
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [existingRoles] = await queryInterface.sequelize.query(
        `SELECT code FROM roles WHERE code IN (:roleCodes)`,
        {
          replacements: { roleCodes: ROLE_CODES },
          transaction,
        },
      );

      if (existingRoles.length > 0) {
        const existingCodes = existingRoles.map((role) => role.code).join(', ');
        throw new Error(
          `Seed 01 aborted: these role codes already exist: ${existingCodes}. ` +
            'Check the existing data before running this seeder.',
        );
      }

      await queryInterface.bulkInsert(
        'roles',
        ROLE_SEED_DATA.map((role) => ({
          ...role,
          created_at: SEED_TIMESTAMP,
          updated_at: SEED_TIMESTAMP,
        })),
        { transaction },
      );
    });
  },

  /**
   * Remove the fixed system roles.
   *
   * This checks users first so the error explains the RESTRICT foreign-key
   * dependency instead of relying only on a lower-level MySQL error.
   */
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [references] = await queryInterface.sequelize.query(
        `
          SELECT COUNT(*) AS total
          FROM users AS u
          INNER JOIN roles AS r ON r.id = u.role_id
          WHERE r.code IN (:roleCodes)
        `,
        {
          replacements: { roleCodes: ROLE_CODES },
          transaction,
        },
      );

      const userCount = Number(references[0]?.total ?? 0);
      if (userCount > 0) {
        throw new Error(
          `Cannot rollback 01-role: ${userCount} user(s) still reference these roles. ` +
            'Rollback dependent user data first.',
        );
      }

      await queryInterface.bulkDelete(
        'roles',
        { code: ROLE_CODES },
        { transaction },
      );
    });
  },
};
