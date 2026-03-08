const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Anahtar-değer bazlı sistem ayarları tablosu
const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true },
  value: { type: DataTypes.TEXT },
  description: { type: DataTypes.STRING }
}, { tableName: 'settings', underscored: true });

module.exports = Setting;
