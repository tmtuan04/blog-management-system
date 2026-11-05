const { select } = require('../seed-helpers');

const LANGUAGES = [
  { id: 1, code: 'vi', name: 'Tiếng Việt', is_default: true, is_active: true },
  { id: 2, code: 'en', name: 'English', is_default: false, is_active: true },
];

const LANGUAGE_CODES = LANGUAGES.map((language) => language.code);
const SEED_TIMESTAMP = '2026-08-01 00:00:00';

/** Bảng tham chiếu languages. posts, post_translations là RESTRICT; còn lại CASCADE nên phải chặn trước */
const DEPENDENT_TABLES = [
  'posts',
  'post_translations',
  'category_translations',
  'ui_translations',
  'page_translations',
];

module.exports = {
  /** vi là ngôn ngữ mặc định, en là ngôn ngữ thứ hai */
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const existing = await select(
        queryInterface,
        'SELECT code FROM languages WHERE code IN (:codes) OR is_default = true',
        { codes: LANGUAGE_CODES },
        transaction,
      );
      if (existing.length > 0) {
        throw new Error(
          `02-languages: đã có ngôn ngữ ${existing.map((row) => row.code).join(', ')} ` +
            '(trùng mã hoặc đã có ngôn ngữ mặc định). Kiểm tra bảng languages trước khi seed.',
        );
      }

      await queryInterface.bulkInsert(
        'languages',
        LANGUAGES.map((language) => ({
          ...language,
          created_at: SEED_TIMESTAMP,
          updated_at: SEED_TIMESTAMP,
        })),
        { transaction },
      );
    });
  },

  /** Không xóa ngôn ngữ còn được tham chiếu, kể cả bảng CASCADE, để rollback không âm thầm xóa dữ liệu */
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const languages = await select(
        queryInterface,
        'SELECT id FROM languages WHERE code IN (:codes)',
        { codes: LANGUAGE_CODES },
        transaction,
      );
      const ids = languages.map((language) => language.id);
      if (ids.length === 0) {
        return;
      }

      const dependencies = [];
      for (const table of DEPENDENT_TABLES) {
        const [row] = await select(
          queryInterface,
          `SELECT COUNT(*) AS total FROM \`${table}\` WHERE language_id IN (:ids)`,
          { ids },
          transaction,
        );
        if (Number(row.total) > 0) {
          dependencies.push(`${table}: ${row.total}`);
        }
      }
      if (dependencies.length > 0) {
        throw new Error(
          `02-languages: ngôn ngữ vẫn đang được dùng (${dependencies.join(', ')}). ` +
            'Rollback các seeder sau trước.',
        );
      }

      await queryInterface.bulkDelete('languages', { id: ids }, { transaction });
    });
  },
};
