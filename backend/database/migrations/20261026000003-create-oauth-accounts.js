'use strict';
const { timestamps, foreignKey, tableOptions } = require('../helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'oauth_accounts',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        user_id: foreignKey(Sequelize, Sequelize.BIGINT, 'users', 'CASCADE'),
        provider: { type: Sequelize.ENUM('google', 'github'), allowNull: false },
        provider_user_id: { type: Sequelize.STRING(255), allowNull: false },
        provider_email: { type: Sequelize.STRING(255), allowNull: true },
        ...timestamps(Sequelize),
      },
      tableOptions,
    );
    await queryInterface.addIndex('oauth_accounts', ['provider', 'provider_user_id'], {
      unique: true,
      name: 'uq_oauth_accounts_provider_user',
    });
    // Mỗi user liên kết tối đa 1 tài khoản / provider
    await queryInterface.addIndex('oauth_accounts', ['user_id', 'provider'], {
      unique: true,
      name: 'uq_oauth_accounts_user_provider',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('oauth_accounts');
  },
};
