const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'creator', 'evaluator', 'participant'), defaultValue: 'participant' },
  avatar: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  whatsapp: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  refresh_token: { type: DataTypes.TEXT }
}, { tableName: 'users', underscored: true });

const Survey = sequelize.define('Survey', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('draft', 'active', 'closed', 'archived'), defaultValue: 'draft' },
  anonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  expires_at: { type: DataTypes.DATE },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  created_by: { type: DataTypes.UUID }
}, { tableName: 'surveys', underscored: true });

const Question = sequelize.define('Question', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  survey_id: { type: DataTypes.UUID },
  type: { type: DataTypes.ENUM('multiple_choice', 'text', 'rating', 'yes_no', 'matrix') },
  text: { type: DataTypes.TEXT, allowNull: false },
  required: { type: DataTypes.BOOLEAN, defaultValue: true },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
  options: { type: DataTypes.JSONB, defaultValue: [] },
  category: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null }
}, { tableName: 'questions', underscored: true });

const SurveyTarget = sequelize.define('SurveyTarget', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  survey_id: { type: DataTypes.UUID },
  user_id: { type: DataTypes.UUID },
  token: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true },
  sent_at: { type: DataTypes.DATE },
  send_method: { type: DataTypes.ENUM('email', 'sms', 'whatsapp') },
  opened_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE }
}, { tableName: 'survey_targets', underscored: true });

const Response = sequelize.define('Response', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  survey_id: { type: DataTypes.UUID },
  user_id: { type: DataTypes.UUID },
  user_hash: { type: DataTypes.STRING },
  target_id: { type: DataTypes.UUID },
  is_complete: { type: DataTypes.BOOLEAN, defaultValue: false },
  duration_seconds: { type: DataTypes.INTEGER }
}, { tableName: 'responses', underscored: true });

const Answer = sequelize.define('Answer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  response_id: { type: DataTypes.UUID },
  question_id: { type: DataTypes.UUID },
  value: { type: DataTypes.JSONB }
}, { tableName: 'answers', underscored: true });

const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID },
  survey_id: { type: DataTypes.UUID },
  action: { type: DataTypes.STRING },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
  ip_address: { type: DataTypes.STRING }
}, { tableName: 'activity_logs', underscored: true });

const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true },
  value: { type: DataTypes.TEXT },
  description: { type: DataTypes.STRING }
}, { tableName: 'settings', underscored: true });

// ── Associations (FK'sız — sadece Sequelize join için) ────────────────────────
User.hasMany(Survey,         { foreignKey: 'created_by',  as: 'surveys' });
Survey.belongsTo(User,       { foreignKey: 'created_by',  as: 'creator' });

Survey.hasMany(Question,     { foreignKey: 'survey_id',   as: 'questions' });
Question.belongsTo(Survey,   { foreignKey: 'survey_id' });

Survey.hasMany(SurveyTarget, { foreignKey: 'survey_id',   as: 'targets' });
SurveyTarget.belongsTo(User, { foreignKey: 'user_id',     as: 'user' });
SurveyTarget.belongsTo(Survey, { foreignKey: 'survey_id', as: 'survey' });

Survey.hasMany(Response,     { foreignKey: 'survey_id',   as: 'responses' });
Response.belongsTo(User,     { foreignKey: 'user_id',     as: 'user' });
Response.hasMany(Answer,     { foreignKey: 'response_id', as: 'answers' });

// ActivityLog ↔ User & Survey
ActivityLog.belongsTo(User,   { foreignKey: 'user_id',   as: 'User',   constraints: false });
User.hasMany(ActivityLog,     { foreignKey: 'user_id',   as: 'activityLogs', constraints: false });
ActivityLog.belongsTo(Survey, { foreignKey: 'survey_id', as: 'survey', constraints: false });
Survey.hasMany(ActivityLog,   { foreignKey: 'survey_id', as: 'activityLogs', constraints: false });

module.exports = {
  sequelize,
  User, Survey, Question,
  SurveyTarget, Response, Answer,
  ActivityLog, Setting
};
