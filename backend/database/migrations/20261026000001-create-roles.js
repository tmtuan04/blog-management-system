'use strict';
const { timestamps, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'roles',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        // user, blog_owner, super_admin. Dùng trong guard phân quyền, không đổi được
        code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  },
};
