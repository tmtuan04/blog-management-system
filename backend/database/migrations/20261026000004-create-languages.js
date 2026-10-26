'use strict';
const { timestamps, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'languages',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        // ISO 639-1: vi, en...
        code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        // Luôn đúng 1 dòng = true, đảm bảo ở service trong transaction
        is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        // Không được tắt ngôn ngữ mặc định
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('languages');
  },
};
