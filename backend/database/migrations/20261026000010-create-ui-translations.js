'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'ui_translations',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        language_id: foreignKey(Sequelize, Sequelize.INTEGER, 'languages', 'CASCADE'),
        // Ví dụ menu.home. `key` là từ khóa của MySQL: truy vấn raw phải đặt trong dấu `
        key: { type: Sequelize.STRING(150), allowNull: false },
        value: { type: Sequelize.TEXT, allowNull: false },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
    await queryInterface.addIndex('ui_translations', ['language_id', 'key'], {
      unique: true,
      name: 'uq_ui_translations_language_key',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ui_translations');
  },
};
