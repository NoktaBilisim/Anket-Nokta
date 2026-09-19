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
}, {
  tableName: 'users',
  underscored: true,
  indexes: [
    { unique: true, fields: ['email'], name: 'idx_users_email' },
    { fields: ['role'], name: 'idx_users_role' },
    { fields: ['is_active'], name: 'idx_users_is_active' },
    { fields: ['created_at'], name: 'idx_users_created_at' }
  ]
});

const Survey = sequelize.define('Survey', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('draft', 'active', 'closed', 'archived'), defaultValue: 'draft' },
  anonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  expires_at: { type: DataTypes.DATE },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  created_by: { type: DataTypes.UUID }
}, {
  tableName: 'surveys',
  underscored: true,
  indexes: [
    { fields: ['created_by', 'status'], name: 'idx_surveys_created_by_status' },
    { fields: ['status'], name: 'idx_surveys_status' },
    { fields: ['created_at'], name: 'idx_surveys_created_at' }
  ]
});

const Question = sequelize.define('Question', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  survey_id: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('multiple_choice', 'text', 'rating', 'yes_no', 'matrix'), allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
  required: { type: DataTypes.BOOLEAN, defaultValue: true },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
  options: { type: DataTypes.JSONB, defaultValue: [] },
  category: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null }
}, {
  tableName: 'questions',
  underscored: true,
  indexes: [
    { fields: ['survey_id', 'order'], name: 'idx_questions_survey_id_order' },
    { fields: ['survey_id', 'category'], name: 'idx_questions_survey_id_category' }
  ]
});

const SurveyTarget = sequelize.define('SurveyTarget', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  survey_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  token: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true },
  sent_at: { type: DataTypes.DATE },
  send_method: { type: DataTypes.ENUM('email', 'sms', 'whatsapp') },
  opened_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE }
}, {
  tableName: 'survey_targets',
  underscored: true,
  indexes: [
    { unique: true, fields: ['token'], name: 'idx_survey_targets_token' },
    { fields: ['survey_id', 'user_id'], name: 'idx_survey_targets_survey_user' },
    { fields: ['user_id', 'created_at'], name: 'idx_survey_targets_user_id' },
    { fields: ['survey_id', 'completed_at'], name: 'idx_survey_targets_survey_completed' }
  ]
});

const Response = sequelize.define('Response', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  survey_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: true },
  user_hash: { type: DataTypes.STRING, allowNull: true },
  target_id: { type: DataTypes.UUID, allowNull: true },
  is_complete: { type: DataTypes.BOOLEAN, defaultValue: false },
  duration_seconds: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'responses',
  underscored: true,
  indexes: [
    { fields: ['survey_id', 'is_complete'], name: 'idx_responses_survey_is_complete' },
    { fields: ['target_id'], name: 'idx_responses_target_id' },
    { fields: ['user_id'], name: 'idx_responses_user_id' },
    { fields: ['is_complete', 'created_at'], name: 'idx_responses_complete_created_at' },
    { fields: ['user_hash'], name: 'idx_responses_user_hash' }
  ]
});

const Answer = sequelize.define('Answer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  response_id: { type: DataTypes.UUID, allowNull: false },
  question_id: { type: DataTypes.UUID, allowNull: false },
  value: { type: DataTypes.JSONB }
}, {
  tableName: 'answers',
  underscored: true,
  indexes: [
    { fields: ['response_id', 'question_id'], name: 'idx_answers_response_question' },
    { fields: ['question_id'], name: 'idx_answers_question_id' }
  ]
});

const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: true },
  survey_id: { type: DataTypes.UUID, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
  ip_address: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'activity_logs',
  underscored: true,
  indexes: [
    { fields: ['created_at'], name: 'idx_activity_logs_created_at' },
    { fields: ['user_id', 'created_at'], name: 'idx_activity_logs_user_created' },
    { fields: ['survey_id', 'created_at'], name: 'idx_activity_logs_survey_created' },
    { fields: ['action', 'created_at'], name: 'idx_activity_logs_action_created' }
  ]
});

const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true },
  value: { type: DataTypes.TEXT },
  description: { type: DataTypes.STRING }
}, {
  tableName: 'settings',
  underscored: true,
  indexes: [
    { unique: true, fields: ['key'], name: 'idx_settings_key' }
  ]
});

// ── Associations (Sequelize ilişkileri) ───────────────────────────────────────
User.hasMany(Survey,         { foreignKey: 'created_by',  as: 'surveys' });
Survey.belongsTo(User,       { foreignKey: 'created_by',  as: 'creator' });

Survey.hasMany(Question,     { foreignKey: 'survey_id',   as: 'questions' });
Question.belongsTo(Survey,   { foreignKey: 'survey_id' });

Survey.hasMany(SurveyTarget, { foreignKey: 'survey_id',   as: 'targets' });
SurveyTarget.belongsTo(User, { foreignKey: 'user_id',     as: 'user' });
SurveyTarget.belongsTo(Survey, { foreignKey: 'survey_id', as: 'survey' });

Survey.hasMany(Response,     { foreignKey: 'survey_id',   as: 'responses' });
Response.belongsTo(User,     { foreignKey: 'user_id',     as: 'user' });
Response.belongsTo(SurveyTarget, { foreignKey: 'target_id', as: 'target' });
Response.hasMany(Answer,     { foreignKey: 'response_id', as: 'answers' });
Answer.belongsTo(Response,   { foreignKey: 'response_id', as: 'response' });
Answer.belongsTo(Question,   { foreignKey: 'question_id', as: 'question' });

// ActivityLog ↔ User & Survey (Denetim izi için constraints: false)
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
