// Cột dùng chung cho migrations.

/** created_at, updated_at: datetime not null default CURRENT_TIMESTAMP */
function timestamps(Sequelize) {
  return {
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  };
}

/** Khóa ngoại: onDelete theo ERD, onUpdate luôn CASCADE */
function foreignKey(Sequelize, type, table, onDelete, allowNull = false) {
  return {
    type,
    allowNull,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete,
  };
}

const tableOptions = {
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  engine: 'InnoDB',
};

module.exports = { timestamps, foreignKey, tableOptions };
