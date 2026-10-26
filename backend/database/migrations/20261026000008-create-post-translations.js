'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'post_translations',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        post_id: foreignKey(Sequelize, Sequelize.BIGINT, 'posts', 'CASCADE'),
        language_id: foreignKey(Sequelize, Sequelize.INTEGER, 'languages', 'RESTRICT'),
        title: { type: Sequelize.STRING(255), allowNull: false },
        slug: { type: Sequelize.STRING(280), allowNull: false },
        excerpt: { type: Sequelize.STRING(500), allowNull: true },
        // HTML đã lọc XSS
        content: { type: Sequelize.TEXT('medium'), allowNull: false },
        // Trạng thái riêng của từng bản dịch
        status: {
          type: Sequelize.ENUM('draft', 'published', 'archived'),
          allowNull: false,
          defaultValue: 'draft',
        },
        view_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        // Ghi lần đầu bản dịch chuyển sang published
        published_at: { type: Sequelize.DATE, allowNull: true },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
    // Mỗi bài có tối đa 1 bản dịch / ngôn ngữ
    await queryInterface.addIndex('post_translations', ['post_id', 'language_id'], {
      unique: true,
      name: 'uq_post_translations_post_language',
    });
    // Slug duy nhất trong cùng ngôn ngữ
    await queryInterface.addIndex('post_translations', ['language_id', 'slug'], {
      unique: true,
      name: 'uq_post_translations_language_slug',
    });
    // Trang chủ UC05, bài theo danh mục UC07 (JOIN posts)
    await queryInterface.addIndex('post_translations', ['language_id', 'status', 'published_at'], {
      name: 'idx_post_translations_listing',
    });
    // Tìm kiếm toàn văn UC19. Parser ngram tách được tiếng Việt và chuỗi không có dấu cách
    await queryInterface.sequelize.query(
      'CREATE FULLTEXT INDEX ft_post_translations_search ON post_translations (title, excerpt, content) WITH PARSER ngram',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('post_translations');
  },
};
