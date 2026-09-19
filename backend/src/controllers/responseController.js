const { Survey, Question, SurveyTarget, Response, Answer, ActivityLog, sequelize } = require('../models');
const crypto = require('crypto');
const { success, error } = require('../utils/response');
const { validateResponseSubmit } = require('../utils/validate');
const { invalidateSurveyReportCache } = require('../utils/redis');
const logger = require('../utils/logger');

exports.getSurveyByToken = async (req, res) => {
  try {
    const token = req.params.token;
    if (!token || typeof token !== 'string') {
      return error(res, 'Geçersiz token', 400);
    }

    const target = await SurveyTarget.findOne({ where: { token } });
    if (!target) return error(res, 'Geçersiz link veya token bulunamadı', 404);

    if (target.completed_at) return error(res, 'Bu anketi zaten doldurdunuz', 400);

    const survey = await Survey.findOne({
      where: { id: target.survey_id },
      include: [{ model: Question, as: 'questions' }],
      order: [[{ model: Question, as: 'questions' }, 'order', 'ASC']]
    });
    if (!survey || survey.status !== 'active') return error(res, 'Anket aktif değil', 400);
    if (survey.expires_at && new Date(survey.expires_at) < new Date()) return error(res, 'Anket süresi doldu', 400);

    if (!target.opened_at) await target.update({ opened_at: new Date() });

    return success(res, { survey, targetId: target.id });
  } catch (err) {
    logger.error('Response getSurveyByToken error:', err);
    return error(res, 'Anket yüklenirken bir hata oluştu');
  }
};

exports.submit = async (req, res) => {
  try {
    const token = req.params.token;
    if (!token || typeof token !== 'string') {
      return error(res, 'Geçersiz token', 400);
    }

    const { error: valError } = validateResponseSubmit(req.body);
    if (valError) return error(res, valError, 400);

    const target = await SurveyTarget.findOne({ where: { token } });
    if (!target) return error(res, 'Geçersiz link veya token bulunamadı', 404);
    if (target.completed_at) return error(res, 'Bu anketi zaten doldurdunuz', 400);

    const survey = await Survey.findByPk(target.survey_id);
    if (!survey || survey.status !== 'active') return error(res, 'Anket aktif değil', 400);
    if (survey.expires_at && new Date(survey.expires_at) < new Date()) return error(res, 'Anket süresi doldu', 400);

    const { answers, duration_seconds } = req.body;

    let user_hash = null;
    if (survey.anonymous) {
      user_hash = crypto.createHash('sha256').update(target.user_id).digest('hex');
    }

    await sequelize.transaction(async (t) => {
      const response = await Response.create({
        survey_id: target.survey_id,
        user_id: survey.anonymous ? null : target.user_id,
        user_hash,
        target_id: target.id,
        is_complete: true,
        duration_seconds: duration_seconds || null
      }, { transaction: t });

      if (answers && answers.length > 0) {
        await Answer.bulkCreate(answers.map(a => ({
          response_id: response.id,
          question_id: a.question_id,
          value: a.value
        })), { transaction: t });
      }

      await target.update({ completed_at: new Date() }, { transaction: t });

      await ActivityLog.create({
        user_id: target.user_id,
        survey_id: target.survey_id,
        action: 'response_submitted',
        ip_address: req.ip
      }, { transaction: t });
    });

    // Rapor önbelleğini temizle
    await invalidateSurveyReportCache(target.survey_id);

    return success(res, { message: 'Yanıtlarınız kaydedildi, teşekkürler!' });
  } catch (err) {
    logger.error('Response submit error:', err);
    return error(res, 'Yanıt kaydedilirken bir hata oluştu');
  }
};
