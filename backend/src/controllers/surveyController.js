const { Survey, Question, SurveyTarget, Response, Answer, User, ActivityLog } = require('../models');
const notificationService = require('../services/notificationService');
const { success, error } = require('../utils/response');
const { Op } = require('sequelize');

exports.list = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'creator') where.created_by = req.user.id;
    if (req.user.role === 'participant' || req.user.role === 'evaluator') {
      const targets = await SurveyTarget.findAll({ where: { user_id: req.user.id } });
      where.id = targets.map(t => t.survey_id);
      where.status = 'active';
    }
    const surveys = await Survey.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']]
    });
    return success(res, surveys);
  } catch (err) { return error(res, err.message); }
};

function parseDate(val) {
  if (!val || val === '' || val === 'Invalid date') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

exports.create = async (req, res) => {
  try {
    const { title, description, anonymous, expires_at, questions } = req.body;
    const survey = await Survey.create({
      title, description, anonymous,
      expires_at: parseDate(expires_at),
      created_by: req.user.id, status: 'draft'
    });
    if (questions?.length) {
      await Question.bulkCreate(questions.map((q, i) => ({ ...q, survey_id: survey.id, order: i })));
    }
    await ActivityLog.create({ user_id: req.user.id, survey_id: survey.id, action: 'survey_created', ip_address: req.ip });
    const full = await Survey.findByPk(survey.id, { include: [{ model: Question, as: 'questions' }] });
    return success(res, full, 201);
  } catch (err) { return error(res, err.message); }
};

exports.get = async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id, {
      include: [
        { model: Question, as: 'questions', order: [['order', 'ASC']] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
      ]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);
    return success(res, survey);
  } catch (err) { return error(res, err.message); }
};

exports.update = async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return error(res, 'Anket bulunamadı', 404);
    if (survey.created_by !== req.user.id && req.user.role !== 'admin')
      return error(res, 'Yetkisiz', 403);
    const { title, description, anonymous, expires_at, questions } = req.body;
    await survey.update({ title, description, anonymous, expires_at: parseDate(expires_at) });
    if (questions) {
      await Question.destroy({ where: { survey_id: survey.id } });
      await Question.bulkCreate(questions.map((q, i) => ({ ...q, survey_id: survey.id, order: i })));
    }
    await ActivityLog.create({ user_id: req.user.id, survey_id: survey.id, action: 'survey_updated', ip_address: req.ip });
    const full = await Survey.findByPk(survey.id, { include: [{ model: Question, as: 'questions' }] });
    return success(res, full);
  } catch (err) { return error(res, err.message); }
};

exports.remove = async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return error(res, 'Anket bulunamadı', 404);
    if (survey.created_by !== req.user.id && req.user.role !== 'admin')
      return error(res, 'Yetkisiz', 403);
    await ActivityLog.create({ user_id: req.user.id, survey_id: survey.id, action: 'survey_deleted', ip_address: req.ip });
    await survey.destroy();
    return success(res, { message: 'Anket silindi' });
  } catch (err) { return error(res, err.message); }
};

exports.changeStatus = async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return error(res, 'Anket bulunamadı', 404);
    await survey.update({ status: req.body.status });
    return success(res, survey);
  } catch (err) { return error(res, err.message); }
};

exports.send = async (req, res) => {
  try {
    const { userIds, method } = req.body;
    const survey = await Survey.findByPk(req.params.id, {
      include: [{ model: Question, as: 'questions' }]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);

    const users = await User.findAll({ where: { id: userIds } });
    const results = { sent: 0, failed: [], targets: [] };

    for (const user of users) {
      let target = await SurveyTarget.findOne({ where: { survey_id: survey.id, user_id: user.id } });
      if (!target) {
        target = await SurveyTarget.create({ survey_id: survey.id, user_id: user.id, send_method: method });
      }
      await target.update({ sent_at: new Date(), send_method: method });
      results.targets.push(target);

      try {
        await notificationService.send(method, user, survey, target.token);
        results.sent++;
      } catch (e) {
        // Artık sessizce yutmuyoruz — hatayı kaydet ve döndür
        console.error(`Bildirim hatası [${user.email}]:`, e.message);
        results.failed.push({ user: user.email, error: e.message });
      }
    }

    if (survey.status === 'draft') await survey.update({ status: 'active' });
    await ActivityLog.create({
      user_id: req.user.id, survey_id: survey.id, action: 'survey_sent',
      metadata: { method, sent: results.sent, failed: results.failed.length },
      ip_address: req.ip
    });

    // Eğer hiç gönderemediyse hata döndür
    if (results.sent === 0 && results.failed.length > 0) {
      return error(res, `E-posta gönderilemedi: ${results.failed[0].error}`, 400);
    }

    return success(res, {
      sent: results.sent,
      failed: results.failed,
      message: results.failed.length > 0
        ? `${results.sent} gönderildi, ${results.failed.length} başarısız`
        : `${results.sent} kişiye başarıyla gönderildi`
    });
  } catch (err) { return error(res, err.message); }
};

exports.report = async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id, {
      include: [{ model: Question, as: 'questions' }]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);

    const responses = await Response.findAll({
      where: { survey_id: survey.id, is_complete: true },
      include: [{ model: Answer, as: 'answers' }]
    });

    const targets = await SurveyTarget.findAll({ where: { survey_id: survey.id } });
    const sent = targets.length;
    const completed = targets.filter(t => t.completed_at).length;
    const opened = targets.filter(t => t.opened_at).length;

    const questionStats = survey.questions.map(q => {
      const answers = responses.flatMap(r => r.answers.filter(a => a.question_id === q.id));
      let stats = {};
      if (q.type === 'multiple_choice' || q.type === 'yes_no') {
        const counts = {};
        answers.forEach(a => {
          const val = Array.isArray(a.value) ? a.value : [a.value];
          val.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        });
        stats = { type: 'chart', data: counts };
      } else if (q.type === 'rating') {
        const vals = answers.map(a => Number(a.value)).filter(Boolean);
        stats = { type: 'rating', average: vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : 0, distribution: vals };
      } else if (q.type === 'text') {
        stats = { type: 'text', responses: answers.map(a => a.value) };
      }
      return { question: q, stats, total: answers.length };
    });

    return success(res, { survey, sent, opened, completed, responseRate: sent ? Math.round((completed / sent) * 100) : 0, questionStats });
  } catch (err) { return error(res, err.message); }
};
