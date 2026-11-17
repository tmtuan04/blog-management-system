'use strict';

/**
 * Dựng lại FULLTEXT `ft_post_translations_search` (UC19) không dùng stopword.
 *
 * Với parser ngram, MySQL bỏ khỏi index mọi token *chứa* stopword. Danh sách
 * mặc định có `a`, `i` và collation `utf8mb4_unicode_ci` không phân biệt dấu,
 * nên mọi cụm 2 ký tự có a, à, ậ, i, ì... đều mất: tìm "REST API", "lap trinh"
 * không ra bài. Stopword gắn với index lúc tạo, nên chỉ cần tắt trong session
 * của migration (không cần quyền SUPER, không đổi cấu hình server).
 */
const INDEX = 'ft_post_translations_search';

async function rebuild(queryInterface, enableStopword) {
  // Transaction để mọi câu chạy trên cùng một kết nối, vì SET SESSION chỉ có
  // tác dụng trên kết nối đó. DDL tự commit nhưng vẫn giữ kết nối.
  await queryInterface.sequelize.transaction(async (transaction) => {
    const run = (sql) => queryInterface.sequelize.query(sql, { transaction });
    await run(`SET SESSION innodb_ft_enable_stopword = ${enableStopword ? 'ON' : 'OFF'}`);
    await run(`DROP INDEX ${INDEX} ON post_translations`);
    await run(
      `CREATE FULLTEXT INDEX ${INDEX} ON post_translations (title, excerpt, content) WITH PARSER ngram`,
    );
    await run('SET SESSION innodb_ft_enable_stopword = DEFAULT');
  });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await rebuild(queryInterface, false);
  },

  async down(queryInterface) {
    await rebuild(queryInterface, true);
  },
};
