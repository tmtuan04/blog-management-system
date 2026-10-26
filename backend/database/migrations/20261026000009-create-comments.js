'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'comments',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        // Mỗi bản dịch có luồng bình luận riêng
        post_translation_id: foreignKey(
          Sequelize,
          Sequelize.BIGINT,
          'post_translations',
          'CASCADE',
        ),
        user_id: foreignKey(Sequelize, Sequelize.BIGINT, 'users', 'RESTRICT'),
        // NULL = bình luận gốc. Chỉ 1 cấp, kiểm tra ở service
        parent_id: foreignKey(Sequelize, Sequelize.BIGINT, 'comments', 'CASCADE', true),
        // Văn bản thuần, 1-1000 ký tự
        content: { type: Sequelize.STRING(1000), allowNull: false },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
    await queryInterface.addIndex('comments', ['post_translation_id', 'parent_id', 'created_at'], {
      name: 'idx_comments_thread',
    });
    await queryInterface.addIndex('comments', ['user_id'], { name: 'idx_comments_user' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comments');
  },
};
