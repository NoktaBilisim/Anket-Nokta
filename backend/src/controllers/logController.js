const { ActivityLog, Survey, SurveyTarget, User, Response } = require('../models');
const { Op, fn, col } = require('sequelize');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    const where = {};
    if (action) where.action = action;
    if (userId) where.user_id = userId;

    const logs = await ActivityLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    return success(res, { rows: logs.rows, total: logs.count, page: Number(page) });
  } catch (err) {
    logger.error('Log list error:', err);
    return error(res, 'İşlem sırasında bir hata oluştu', 500);
  }
};

exports.stats = async (req, res) => {
  try {
    const totalSurveys    = await Survey.count();
    const activeSurveys   = await Survey.count({ where: { status: 'active' } });
    const totalResponses  = await Response.count({ where: { is_complete: true } });
    const totalUsers      = await User.count();

    // Son 7 günlük yanıt dağılımı
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyResponses = await Response.findAll({
      where: { is_complete: true, created_at: { [Op.gte]: sevenDaysAgo } },
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')),        'count']
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']]
    });

    // Son aktiviteler
    const recentActivity = await ActivityLog.findAll({
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    return success(res, {
      totalSurveys,
      activeSurveys,
      totalResponses,
      totalUsers,
      dailyResponses,
      recentActivity
    });
  } catch (err) {
    logger.error('Log stats error:', err);
    return error(res, 'İşlem sırasında bir hata oluştu', 500);
  }
};

exports.mySurveys = async (req, res) => {
  try {
    const targets = await SurveyTarget.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Survey,
        as: 'survey'
      }],
      order: [['created_at', 'DESC']]
    });
    return success(res, targets);
  } catch (err) {
    logger.error('Log mySurveys error:', err);
    return error(res, 'İşlem sırasında bir hata oluştu', 500);
  }
};
