'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'category_translations',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        category_id: foreignKey(Sequelize, Sequelize.INTEGER, 'categories', 'CASCADE'),
        language_id: foreignKey(Sequelize, Sequelize.INTEGER, 'languages', 'CASCADE'),
        name: { type: Sequelize.STRING(150), allowNull: false },
        // Sinh từ name, bỏ dấu
        slug: { type: Sequelize.STRING(180), allowNull: false },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
    await queryInterface.addIndex('category_translations', ['category_id', 'language_id'], {
      unique: true,
      name: 'uq_category_translations_category_language',
    });
    // Slug duy nhất trong cùng ngôn ngữ
    await queryInterface.addIndex('category_translations', ['language_id', 'slug'], {
      unique: true,
      name: 'uq_category_translations_language_slug',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('category_translations');
  },
};
