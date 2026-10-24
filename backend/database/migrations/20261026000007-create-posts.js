'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'posts',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        // Tác giả
        user_id: foreignKey(Sequelize, Sequelize.BIGINT, 'users', 'RESTRICT'),
        // Ngôn ngữ gốc, chọn khi tạo bài, không đổi được
        language_id: foreignKey(Sequelize, Sequelize.INTEGER, 'languages', 'RESTRICT'),
        // Dùng chung cho mọi bản dịch
        category_id: foreignKey(Sequelize, Sequelize.INTEGER, 'categories', 'RESTRICT'),
        thumbnail: { type: Sequelize.STRING(255), allowNull: true },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
    // Danh sách bài của owner (UC13), bài theo danh mục (UC07)
    await queryInterface.addIndex('posts', ['user_id'], { name: 'idx_posts_user' });
    await queryInterface.addIndex('posts', ['category_id'], { name: 'idx_posts_category' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('posts');
  },
};
