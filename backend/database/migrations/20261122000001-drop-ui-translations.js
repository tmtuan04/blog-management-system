'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/**
 * Bỏ UC17 (requirements 2.2, quyết định D5): chữ tĩnh nằm trong file JSON của frontend
 * (`html/i18n/<code>.json`), không còn lưu trong CSDL.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('ui_translations');
  },

  /** Dựng lại bảng rỗng như migration 20261026000010, không khôi phục dữ liệu */
  async down(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'ui_translations',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        language_id: foreignKey(Sequelize, Sequelize.INTEGER, 'languages', 'CASCADE'),
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
};
