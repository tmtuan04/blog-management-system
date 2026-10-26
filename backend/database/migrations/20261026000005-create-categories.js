'use strict';
const { timestamps, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'categories',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('categories');
  },
};
