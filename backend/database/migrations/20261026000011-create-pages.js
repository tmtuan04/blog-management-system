'use strict';
const { timestamps, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'pages',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        // about, contact, privacy. Chỉ tạo bằng seeder, không đổi được
        key: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        // Áp dụng cho mọi ngôn ngữ
        is_visible: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pages');
  },
};
