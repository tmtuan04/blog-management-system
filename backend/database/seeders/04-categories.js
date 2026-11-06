const { skipInProduction, select, languageIds, assertIdsFree } = require('../seed-helpers');

const SEEDER = '04-categories';

const CATEGORIES = [
  { id: 1, timestamp: '2026-08-02 09:00:00', vi: ['Lập trình', 'lap-trinh'], en: ['Programming', 'programming'] },
  // Chỉ có tên vi: xem ở en sẽ hiện "Đời sống" (dùng tên ở ngôn ngữ mặc định)
  { id: 2, timestamp: '2026-08-02 09:05:00', vi: ['Đời sống', 'doi-song'], en: null },
  { id: 3, timestamp: '2026-08-02 09:10:00', vi: ['Công nghệ', 'cong-nghe'], en: ['Technology', 'technology'] },
  { id: 4, timestamp: '2026-08-02 09:15:00', vi: ['Học tập', 'hoc-tap'], en: ['Learning', 'learning'] },
  // Chưa có bài viết: dùng để xem trạng thái danh mục rỗng (UC07)
  { id: 5, timestamp: '2026-08-02 09:20:00', vi: ['Tin tức', 'tin-tuc'], en: ['News', 'news'] },
];

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

/** id bản dịch đánh liên tục theo thứ tự danh mục, vi trước en */
function translations(languages) {
  let id = 0;
  return CATEGORIES.flatMap((category) =>
    ['vi', 'en']
      .filter((code) => category[code])
      .map((code) => ({
        id: ++id,
        category_id: category.id,
        language_id: languages[code],
        name: category[code][0],
        slug: category[code][1],
        created_at: category.timestamp,
        updated_at: category.timestamp,
      })),
  );
}

module.exports = {
  /** 5 danh mục, 9 tên theo ngôn ngữ */
  async up(queryInterface) {
    if (skipInProduction(SEEDER)) {
      return;
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      const languages = await languageIds(queryInterface, transaction, SEEDER);
      const rows = translations(languages);

      await assertIdsFree(queryInterface, 'categories', CATEGORY_IDS, transaction, SEEDER);
      await assertIdsFree(
        queryInterface,
        'category_translations',
        rows.map((row) => row.id),
        transaction,
        SEEDER,
      );
      for (const code of ['vi', 'en']) {
        const slugs = rows.filter((row) => row.language_id === languages[code]).map((row) => row.slug);
        const taken = await select(
          queryInterface,
          'SELECT slug FROM category_translations WHERE language_id = :languageId AND slug IN (:slugs)',
          { languageId: languages[code], slugs },
          transaction,
        );
        if (taken.length > 0) {
          throw new Error(
            `${SEEDER}: slug ${code} đã có: ${taken.map((row) => row.slug).join(', ')}.`,
          );
        }
      }

      await queryInterface.bulkInsert(
        'categories',
        CATEGORIES.map((category) => ({
          id: category.id,
          created_at: category.timestamp,
          updated_at: category.timestamp,
        })),
        { transaction },
      );
      await queryInterface.bulkInsert('category_translations', rows, { transaction });
    });
  },

  /** posts.category_id là RESTRICT nên rollback 05-posts trước. Tên theo ngôn ngữ xóa theo CASCADE */
  async down(queryInterface) {
    if (skipInProduction(SEEDER)) {
      return;
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [posts] = await select(
        queryInterface,
        'SELECT COUNT(*) AS total FROM posts WHERE category_id IN (:ids)',
        { ids: CATEGORY_IDS },
        transaction,
      );
      if (Number(posts.total) > 0) {
        throw new Error(
          `${SEEDER}: còn ${posts.total} bài viết thuộc các danh mục mẫu. Rollback 05-posts trước.`,
        );
      }
      await queryInterface.bulkDelete('categories', { id: CATEGORY_IDS }, { transaction });
    });
  },
};
