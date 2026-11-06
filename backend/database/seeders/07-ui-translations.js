const { select, languageIds } = require('../seed-helpers');
// Sinh bằng `npm run i18n:extract` từ các key data-i18n trong html/, giá trị en dịch tay
const UI_TRANSLATIONS = require('../seed-data/ui-translations.json');

const SEEDER = '07-ui-translations';
const SEED_TIMESTAMP = '2026-08-01 00:00:00';
const KEY_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;
const KEYS = Object.keys(UI_TRANSLATIONS);

module.exports = {
  /** Mỗi key một dòng vi (bắt buộc) và một dòng en. Thiếu en thì giao diện dùng giá trị vi */
  async up(queryInterface) {
    const invalid = KEYS.filter((key) => !KEY_PATTERN.test(key) || !UI_TRANSLATIONS[key].vi);
    if (invalid.length > 0) {
      throw new Error(`${SEEDER}: key sai dạng hoặc thiếu giá trị vi: ${invalid.join(', ')}`);
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      const languages = await languageIds(queryInterface, transaction, SEEDER);
      const taken = await select(
        queryInterface,
        'SELECT DISTINCT `key` FROM ui_translations WHERE `key` IN (:keys)',
        { keys: KEYS },
        transaction,
      );
      if (taken.length > 0) {
        throw new Error(
          `${SEEDER}: ${taken.length} key đã có trong ui_translations (ví dụ ${taken[0].key}). ` +
            'Chạy npm run db:seed:undo hoặc làm lại database trống trước.',
        );
      }

      const rows = KEYS.flatMap((key) =>
        ['vi', 'en']
          .filter((code) => UI_TRANSLATIONS[key][code])
          .map((code) => ({
            language_id: languages[code],
            key,
            value: UI_TRANSLATIONS[key][code],
            created_at: SEED_TIMESTAMP,
            updated_at: SEED_TIMESTAMP,
          })),
      );
      await queryInterface.bulkInsert('ui_translations', rows, { transaction });
    });
  },

  /** Xóa các key của file seed ở mọi ngôn ngữ, kể cả ngôn ngữ admin thêm sau (đã được sao chép key) */
  async down(queryInterface) {
    await queryInterface.bulkDelete('ui_translations', { key: KEYS });
  },
};
