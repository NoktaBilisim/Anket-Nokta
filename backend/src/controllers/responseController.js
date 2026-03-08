const { Survey, Question, SurveyTarget, Response, Answer, ActivityLog } = require('../models');
const crypto = require('crypto');
const { success, error } = require('../utils/response');

exports.getSurveyByToken = async (req, res) => {
  try {
    const target = await SurveyTarget.findOne({ where: { token: req.params.token } });
    if (!target) return error(res, 'Geçersiz link', 404);

    if (target.completed_at) return error(res, 'Bu anketi zaten doldurdunuz', 400);

    const survey = await Survey.findByPk(target.survey_id, {
      include: [{ model: Question, as: 'questions', order: [['order', 'ASC']] }]
    });
    if (!survey || survey.status !== 'active') return error(res, 'Anket aktif değil', 400);
    if (survey.expires_at && new Date(survey.expires_at) < new Date()) return error(res, 'Anket süresi doldu', 400);

    if (!target.opened_at) await target.update({ opened_at: new Date() });

    return success(res, { survey, targetId: target.id });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.submit = async (req, res) => {
  try {
    const target = await SurveyTarget.findOne({ where: { token: req.params.token } });
    if (!target) return error(res, 'Geçersiz link', 404);
    if (target.completed_at) return error(res, 'Bu anketi zaten doldurdunuz', 400);

    const survey = await Survey.findByPk(target.survey_id);
    const { answers, duration_seconds } = req.body;

    let user_hash = null;
    if (survey.anonymous) {
      user_hash = crypto.createHash('sha256').update(target.user_id).digest('hex');
    }

    const response = await Response.create({
      survey_id: target.survey_id,
      user_id: survey.anonymous ? null : target.user_id,
      user_hash,
      target_id: target.id,
      is_complete: true,
      duration_seconds
    });

    await Answer.bulkCreate(answers.map(a => ({ response_id: response.id, question_id: a.question_id, value: a.value })));
    await target.update({ completed_at: new Date() });

    await ActivityLog.create({
      user_id: target.user_id,
      survey_id: target.survey_id,
      action: 'response_submitted',
      ip_address: req.ip
    });

    return success(res, { message: 'Yanıtlarınız kaydedildi, teşekkürler!' });
  } catch (err) {
    return error(res, err.message);
  }
};
