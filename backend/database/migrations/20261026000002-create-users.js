'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'users',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        full_name: { type: Sequelize.STRING(150), allowNull: false },
        email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
        // NULL với tài khoản tạo qua OAuth chưa đặt mật khẩu
        password_hash: { type: Sequelize.STRING(255), allowNull: true },
        avatar: { type: Sequelize.STRING(255), allowNull: true },
        role_id: foreignKey(Sequelize, Sequelize.INTEGER, 'roles', 'RESTRICT'),
        // Khóa tài khoản = false, không xóa cứng (D8)
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
