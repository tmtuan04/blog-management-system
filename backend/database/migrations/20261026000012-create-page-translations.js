'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'page_translations',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        page_id: foreignKey(Sequelize, Sequelize.INTEGER, 'pages', 'CASCADE'),
        language_id: foreignKey(Sequelize, Sequelize.INTEGER, 'languages', 'CASCADE'),
        title: { type: Sequelize.STRING(255), allowNull: false },
        // HTML đã lọc XSS
        content: { type: Sequelize.TEXT('medium'), allowNull: false },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
    await queryInterface.addIndex('page_translations', ['page_id', 'language_id'], {
      unique: true,
      name: 'uq_page_translations_page_language',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('page_translations');
  },
};
