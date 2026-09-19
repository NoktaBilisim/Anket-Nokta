const { Survey, Question, SurveyTarget, Response, Answer, User, ActivityLog, sequelize } = require('../models');
const notificationService = require('../services/notificationService');
const { success, error } = require('../utils/response');
const { getCache, setCache, invalidateSurveyReportCache } = require('../utils/redis');
const {
  validateSurveyCreate,
  validateSurveyUpdate,
  validateSurveyStatus,
  validateSurveySend,
  isValidUUID
} = require('../utils/validate');
const logger = require('../utils/logger');

function parseDate(val) {
  if (!val || val === '' || val === 'Invalid date') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function findScore(options, selectedValue) {
  if (!Array.isArray(options)) return 0;
  const opt = options.find(o => {
    const text = typeof o === 'string' ? o : o.text;
    return text === selectedValue;
  });
  if (!opt) return 0;
  return typeof opt === 'string' ? 0 : (opt.score ?? 0);
}

function calcQuestionScore(q, answerValue) {
  if (answerValue === undefined || answerValue === null) return 0;
  if (q.type === 'rating') return Number(answerValue) || 0;
  if (q.type === 'multiple_choice' || q.type === 'yes_no') {
    const opts = Array.isArray(q.options) ? q.options : [];
    const vals = Array.isArray(answerValue) ? answerValue : [answerValue];
    return vals.reduce((sum, v) => sum + findScore(opts, v), 0);
  }
  if (q.type === 'matrix') {
    const cols = q.options?.columns || [];
    if (typeof answerValue !== 'object') return 0;
    return Object.values(answerValue).reduce((sum, colText) => {
      const col = cols.find(c => (typeof c === 'string' ? c : c.text) === colText);
      return sum + (col ? (col.score ?? 0) : 0);
    }, 0);
  }
  return 0;
}

function buildScoreTable(q, answers) {
  if (q.type === 'multiple_choice' || q.type === 'yes_no') {
    const opts = Array.isArray(q.options) ? q.options : [];
    return opts.map(opt => {
      const text  = typeof opt === 'string' ? opt : opt.text;
      const score = typeof opt === 'string' ? 0  : (opt.score ?? 0);
      const count = answers.filter(a => {
        const v = Array.isArray(a.value) ? a.value : [a.value];
        return v.includes(text);
      }).length;
      return { text, score, count, totalScore: score * count };
    });
  }
  if (q.type === 'matrix') {
    const cols = q.options?.columns || [];
    const rows = q.options?.rows    || [];
    return cols.map(col => {
      const text  = typeof col === 'string' ? col : col.text;
      const score = typeof col === 'string' ? 0  : (col.score ?? 0);
      let count = 0;
      answers.forEach(a => {
        if (typeof a.value === 'object' && a.value !== null)
          Object.values(a.value).forEach(v => { if (v === text) count++; });
      });
      return { text, score, count, totalScore: score * count, rowCount: rows.length };
    });
  }
  return [];
}

/**
 * Excel Formül Enjeksiyonunu Önleyici Temizleme (CSV/Excel Formula Injection Mitigation)
 */
function sanitizeExcelCell(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  const str = String(val);
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some(prefix => str.startsWith(prefix))) {
    return `'${str}`;
  }
  return str;
}

/**
 * Anket raporu ve Excel erişim yetki kontrolü (Admin, Kendi anketini yöneten Creator, Atanmış Evaluator)
 */
async function canAccessSurveyReport(user, survey) {
  if (user.role === 'admin') return true;
  if (user.role === 'creator' && survey.created_by === user.id) return true;
  if (user.role === 'evaluator') {
    const target = await SurveyTarget.findOne({
      where: { survey_id: survey.id, user_id: user.id }
    });
    if (target) return true;
  }
  return false;
}

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
  } catch (err) {
    logger.error('Survey list error:', err);
    return error(res, 'Anketler listelenirken bir hata oluştu');
  }
};

exports.create = async (req, res) => {
  try {
    const { error: valError } = validateSurveyCreate(req.body);
    if (valError) return error(res, valError, 400);

    const { title, description, anonymous, expires_at, questions } = req.body;

    const full = await sequelize.transaction(async (t) => {
      const survey = await Survey.create({
        title: title.trim(),
        description: description || null,
        anonymous: !!anonymous,
        expires_at: parseDate(expires_at),
        created_by: req.user.id,
        status: 'draft'
      }, { transaction: t });

      if (questions?.length) {
        await Question.bulkCreate(questions.map((q, i) => ({
          ...q,
          category: q.category || null,
          survey_id: survey.id,
          order: i
        })), { transaction: t });
      }

      await ActivityLog.create({
        user_id: req.user.id,
        survey_id: survey.id,
        action: 'survey_created',
        ip_address: req.ip
      }, { transaction: t });

      return await Survey.findOne({
        where: { id: survey.id },
        include: [{ model: Question, as: 'questions' }],
        order: [[{ model: Question, as: 'questions' }, 'order', 'ASC']],
        transaction: t
      });
    });

    return success(res, full, 201);
  } catch (err) {
    logger.error('Survey create error:', err);
    return error(res, 'Anket oluşturulurken bir hata oluştu');
  }
};

exports.get = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz anket ID formatı', 400);
    }

    const survey = await Survey.findOne({
      where: { id: req.params.id },
      include: [
        { model: Question, as: 'questions' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
      ],
      order: [[{ model: Question, as: 'questions' }, 'order', 'ASC']]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);

    // Yetki kontrolü (IDOR Koruması)
    if (req.user.role === 'admin') {
      // Admin tüm anketleri görebilir
    } else if (req.user.role === 'creator') {
      if (survey.created_by !== req.user.id) {
        return error(res, 'Bu anketi görüntüleme yetkiniz yok', 403);
      }
    } else if (req.user.role === 'evaluator' || req.user.role === 'participant') {
      if (survey.status !== 'active') {
        return error(res, 'Bu anketi görüntüleme yetkiniz yok', 403);
      }
      const target = await SurveyTarget.findOne({
        where: { survey_id: survey.id, user_id: req.user.id }
      });
      if (!target) {
        return error(res, 'Bu anketi görüntüleme yetkiniz yok', 403);
      }
    } else {
      return error(res, 'Bu anketi görüntüleme yetkiniz yok', 403);
    }

    return success(res, survey);
  } catch (err) {
    logger.error('Survey get error:', err);
    return error(res, 'Anket bilgisi alınırken bir hata oluştu');
  }
};

exports.update = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz anket ID formatı', 400);
    }

    const { error: valError } = validateSurveyUpdate(req.body);
    if (valError) return error(res, valError, 400);

    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return error(res, 'Anket bulunamadı', 404);
    if (survey.created_by !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Bu anketi güncelleme yetkiniz yok', 403);
    }

    const { title, description, anonymous, expires_at, questions } = req.body;

    const full = await sequelize.transaction(async (t) => {
      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description;
      if (anonymous !== undefined) updateData.anonymous = !!anonymous;
      if (expires_at !== undefined) updateData.expires_at = parseDate(expires_at);

      await survey.update(updateData, { transaction: t });

      if (questions) {
        await Question.destroy({ where: { survey_id: survey.id }, transaction: t });
        await Question.bulkCreate(questions.map((q, i) => ({
          ...q,
          category: q.category || null,
          survey_id: survey.id,
          order: i
        })), { transaction: t });
      }

      await ActivityLog.create({
        user_id: req.user.id,
        survey_id: survey.id,
        action: 'survey_updated',
        ip_address: req.ip
      }, { transaction: t });

      return await Survey.findOne({
        where: { id: survey.id },
        include: [{ model: Question, as: 'questions' }],
        order: [[{ model: Question, as: 'questions' }, 'order', 'ASC']],
        transaction: t
      });
    });

    // Redis önbelleğini geçersiz kıl
    await invalidateSurveyReportCache(survey.id);

    return success(res, full);
  } catch (err) {
    logger.error('Survey update error:', err);
    return error(res, 'Anket güncellenirken bir hata oluştu');
  }
};

exports.remove = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz anket ID formatı', 400);
    }

    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return error(res, 'Anket bulunamadı', 404);
    if (survey.created_by !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Bu anketi silme yetkiniz yok', 403);
    }

    await invalidateSurveyReportCache(survey.id);

    await ActivityLog.create({
      user_id: req.user.id,
      survey_id: survey.id,
      action: 'survey_deleted',
      ip_address: req.ip
    });
    await survey.destroy();

    return success(res, { message: 'Anket silindi' });
  } catch (err) {
    logger.error('Survey delete error:', err);
    return error(res, 'Anket silinirken bir hata oluştu');
  }
};

exports.changeStatus = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz anket ID formatı', 400);
    }

    const { error: valError } = validateSurveyStatus(req.body.status);
    if (valError) return error(res, valError, 400);

    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return error(res, 'Anket bulunamadı', 404);
    if (survey.created_by !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Bu anketin durumunu değiştirme yetkiniz yok', 403);
    }

    await survey.update({ status: req.body.status });
    await invalidateSurveyReportCache(survey.id);

    return success(res, survey);
  } catch (err) {
    logger.error('Survey status change error:', err);
    return error(res, 'Anket durumu güncellenirken bir hata oluştu');
  }
};

exports.send = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz anket ID formatı', 400);
    }

    const { error: valError } = validateSurveySend(req.body);
    if (valError) return error(res, valError, 400);

    const { userIds, method } = req.body;
    const survey = await Survey.findOne({
      where: { id: req.params.id },
      include: [{ model: Question, as: 'questions' }],
      order: [[{ model: Question, as: 'questions' }, 'order', 'ASC']]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);

    const users = await User.findAll({ where: { id: userIds } });
    if (users.length === 0) {
      return error(res, 'Seçilen kullanıcılar bulunamadı', 404);
    }

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
        logger.error(`Bildirim hatası [${user.email}]:`, e);
        results.failed.push({ user: user.email, error: e.message });
      }
    }

    if (survey.status === 'draft') await survey.update({ status: 'active' });
    await ActivityLog.create({
      user_id: req.user.id,
      survey_id: survey.id,
      action: 'survey_sent',
      metadata: { method, sent: results.sent, failed: results.failed.length },
      ip_address: req.ip
    });

    await invalidateSurveyReportCache(survey.id);

    if (results.sent === 0 && results.failed.length > 0) {
      return error(res, `Gönderilemedi: ${results.failed[0].error}`, 400);
    }

    return success(res, {
      sent: results.sent,
      failed: results.failed,
      message: results.failed.length > 0
        ? `${results.sent} gönderildi, ${results.failed.length} başarısız`
        : `${results.sent} kişiye başarıyla gönderildi`
    });
  } catch (err) {
    logger.error('Survey send error:', err);
    return error(res, 'Anket gönderilirken bir hata oluştu');
  }
};

exports.report = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz anket ID formatı', 400);
    }

    const survey = await Survey.findOne({
      where: { id: req.params.id },
      include: [{ model: Question, as: 'questions' }],
      order: [[{ model: Question, as: 'questions' }, 'order', 'ASC']]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);

    const hasAccess = await canAccessSurveyReport(req.user, survey);
    if (!hasAccess) {
      return error(res, 'Bu anketin raporuna erişim yetkiniz yok', 403);
    }

    const cacheKey = `survey:${req.params.id}:report`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return success(res, cached);
    }

    const targets = await SurveyTarget.findAll({
      where: { survey_id: survey.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }]
    });

    const responses = await Response.findAll({
      where: { survey_id: survey.id, is_complete: true },
      include: [
        { model: Answer, as: 'answers' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ]
    });

    const sent      = targets.length;
    const completed = targets.filter(t => t.completed_at).length;
    const opened    = targets.filter(t => t.opened_at).length;

    const userScores = responses.map(resp => {
      let totalScore = 0;
      const perQuestion = survey.questions.map(q => {
        const ans   = resp.answers.find(a => a.question_id === q.id);
        const score = ans ? calcQuestionScore(q, ans.value) : 0;
        totalScore += score;
        return { questionId: q.id, questionText: q.text, category: q.category || null, answer: ans?.value ?? null, score };
      });
      const user = resp.user || {};
      return {
        responseId:  resp.id,
        userId:      resp.user_id,
        userName:    user.name  || 'Anonim',
        userEmail:   user.email || '',
        completedAt: resp.updated_at,
        duration:    resp.duration_seconds,
        totalScore,
        perQuestion
      };
    });

    const questionStats = survey.questions.map(q => {
      const answers = responses.flatMap(r => r.answers.filter(a => a.question_id === q.id));
      const hasScoring = ['multiple_choice', 'yes_no', 'matrix', 'rating'].includes(q.type);
      let stats = {};

      if (q.type === 'multiple_choice' || q.type === 'yes_no') {
        const opts = Array.isArray(q.options) ? q.options : [];
        const counts = {};
        const scoreMap = {};
        opts.forEach(o => {
          const t = typeof o === 'string' ? o : o.text;
          counts[t]   = 0;
          scoreMap[t] = typeof o === 'string' ? 0 : (o.score ?? 0);
        });
        answers.forEach(a => {
          const vals = Array.isArray(a.value) ? a.value : [a.value];
          vals.forEach(v => { if (v in counts) counts[v]++; });
        });
        const scoreTable    = buildScoreTable(q, answers);
        const totalScoreSum = scoreTable.reduce((s, r) => s + r.totalScore, 0);
        stats = { type: 'chart', data: counts, scoreMap, scoreTable, totalScoreSum, hasScoring };

      } else if (q.type === 'rating') {
        const vals = answers.map(a => Number(a.value)).filter(Boolean);
        const totalScoreSum = vals.reduce((s, v) => s + v, 0);
        stats = { type: 'rating', average: vals.length ? (totalScoreSum / vals.length).toFixed(1) : 0, distribution: vals, totalScoreSum, hasScoring: true };

      } else if (q.type === 'matrix') {
        const scoreTable    = buildScoreTable(q, answers);
        const totalScoreSum = scoreTable.reduce((s, r) => s + r.totalScore, 0);
        const rows = q.options?.rows    || [];
        const cols = q.options?.columns || [];
        const rowStats = rows.map((row, ri) => {
          const rowText  = typeof row === 'string' ? row : row.text;
          const colCounts = {};
          cols.forEach(c => { colCounts[typeof c === 'string' ? c : c.text] = 0; });
          answers.forEach(a => {
            if (typeof a.value === 'object' && a.value !== null && a.value[ri] !== undefined) {
              const colText = a.value[ri];
              if (colText in colCounts) colCounts[colText]++;
            }
          });
          return { rowText, colCounts };
        });
        stats = { type: 'matrix', scoreTable, totalScoreSum, rowStats, hasScoring: true };

      } else if (q.type === 'text') {
        stats = { type: 'text', responses: answers.map(a => a.value), hasScoring: false };
      }

      return { question: q, stats, total: answers.length };
    });

    const categoryMap = {};
    survey.questions.forEach(q => {
      const cat = q.category || 'Kategorisiz';
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, questions: [], totalScoreSum: 0, questionCount: 0 };
      categoryMap[cat].questions.push(q.id);
      categoryMap[cat].questionCount++;
    });

    Object.values(categoryMap).forEach(catInfo => {
      catInfo.totalScoreSum = questionStats
        .filter(qs => catInfo.questions.includes(qs.question.id))
        .reduce((s, qs) => s + (qs.stats.totalScoreSum || 0), 0);
    });

    const userCategoryScores = userScores.map(us => {
      const catScores = {};
      Object.entries(categoryMap).forEach(([cat, info]) => {
        catScores[cat] = us.perQuestion
          .filter(pq => info.questions.includes(pq.questionId))
          .reduce((s, pq) => s + pq.score, 0);
      });
      return { ...us, catScores };
    });

    const totalScoreAll = questionStats.reduce((s, qs) => s + (qs.stats.totalScoreSum || 0), 0);
    const avgScore      = userScores.length
      ? (userScores.reduce((s, u) => s + u.totalScore, 0) / userScores.length).toFixed(1)
      : 0;

    const categories = [...new Set(survey.questions.map(q => q.category).filter(Boolean))];

    const reportData = {
      survey, sent, opened, completed,
      responseRate: sent ? Math.round((completed / sent) * 100) : 0,
      questionStats,
      userScores: userCategoryScores,
      categoryMap,
      categories,
      totalScoreAll,
      avgScore,
    };

    // Redis önbelleğe kaydet (TTL: 5 dakika = 300 sn)
    await setCache(cacheKey, reportData, 300);

    return success(res, reportData);
  } catch (err) {
    logger.error('Survey report error:', err);
    return error(res, 'Rapor hesaplanırken bir hata oluştu');
  }
};

exports.exportExcel = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz anket ID formatı', 400);
    }

    const XLSX = require('xlsx');
    const survey = await Survey.findOne({
      where: { id: req.params.id },
      include: [{ model: Question, as: 'questions' }],
      order: [[{ model: Question, as: 'questions' }, 'order', 'ASC']]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);

    const hasAccess = await canAccessSurveyReport(req.user, survey);
    if (!hasAccess) {
      return error(res, 'Bu anketin raporuna erişim yetkiniz yok', 403);
    }

    const responses = await Response.findAll({
      where: { survey_id: survey.id, is_complete: true },
      include: [
        { model: Answer, as: 'answers' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    const targets = await SurveyTarget.findAll({
      where: { survey_id: survey.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });

    const wb = XLSX.utils.book_new();

    const questionHeaders = survey.questions.map((q, i) => `S${i+1}: ${q.text}`);
    const scoreHeaders    = survey.questions.map((q, i) => `S${i+1} Puan`);

    const rows1 = responses.map(resp => {
      const user = resp.user || {};
      let totalScore = 0;
      const answerVals = survey.questions.map(q => {
        const ans = resp.answers.find(a => a.question_id === q.id);
        const val = ans?.value;
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && !Array.isArray(val)) {
          const rows = q.options?.rows || [];
          return Object.entries(val).map(([ri, cv]) => {
            const rowText = typeof rows[ri] === 'string' ? rows[ri] : (rows[ri]?.text || `Madde ${Number(ri)+1}`);
            return `${rowText}: ${cv}`;
          }).join(' | ');
        }
        if (Array.isArray(val)) return val.join(', ');
        return String(val);
      });
      const scoreVals = survey.questions.map(q => {
        const ans   = resp.answers.find(a => a.question_id === q.id);
        const score = ans ? calcQuestionScore(q, ans.value) : 0;
        totalScore += score;
        return score;
      });
      const row = {
        'Ad Soyad':   sanitizeExcelCell(user.name || 'Anonim'),
        'E-posta':    sanitizeExcelCell(user.email || ''),
        'Tamamlanma': resp.updated_at ? new Date(resp.updated_at).toLocaleString('tr-TR') : '',
        'Süre (sn)':  resp.duration_seconds || '',
      };
      questionHeaders.forEach((h, i) => { row[h] = sanitizeExcelCell(answerVals[i]) });
      scoreHeaders.forEach((h, i)    => { row[h] = scoreVals[i] });
      row['TOPLAM PUAN'] = totalScore;
      return row;
    });

    const ws1 = XLSX.utils.json_to_sheet(rows1);
    ws1['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 20 }, { wch: 10 },
      ...survey.questions.map(() => ({ wch: 30 })),
      ...survey.questions.map(() => ({ wch: 12 })),
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Yanıtlar');

    const rows2 = [];
    survey.questions.forEach((q, qi) => {
      const answers = responses.flatMap(r => r.answers.filter(a => a.question_id === q.id));
      const cat = q.category || '—';

      if (q.type === 'multiple_choice' || q.type === 'yes_no') {
        const opts = Array.isArray(q.options) ? q.options : [];
        opts.forEach(opt => {
          const text  = typeof opt === 'string' ? opt : opt.text;
          const score = typeof opt === 'string' ? 0  : (opt.score ?? 0);
          const count = answers.filter(a => {
            const v = Array.isArray(a.value) ? a.value : [a.value];
            return v.includes(text);
          }).length;
          rows2.push({
            'Soru No': `S${qi+1}`,
            'Kategori': sanitizeExcelCell(cat),
            'Soru': sanitizeExcelCell(q.text),
            'Tür': q.type === 'yes_no' ? 'Evet/Hayır' : 'Çoktan Seçmeli',
            'Seçenek': sanitizeExcelCell(text),
            'Seçenek Puanı': score,
            'Seçilme Sayısı': count,
            'Toplam Puan': score * count,
          });
        });
      } else if (q.type === 'rating') {
        const vals = answers.map(a => Number(a.value)).filter(Boolean);
        const avg  = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : 0;
        rows2.push({
          'Soru No': `S${qi+1}`,
          'Kategori': sanitizeExcelCell(cat),
          'Soru': sanitizeExcelCell(q.text),
          'Tür': 'Puanlama',
          'Seçenek': '—',
          'Seçenek Puanı': '—',
          'Seçilme Sayısı': vals.length,
          'Toplam Puan': vals.reduce((s, v) => s + v, 0),
          'Ortalama': avg,
        });
      } else if (q.type === 'matrix') {
        const cols       = q.options?.columns || [];
        const matrixRows = q.options?.rows    || [];
        cols.forEach(col => {
          const colText  = typeof col === 'string' ? col : col.text;
          const colScore = typeof col === 'string' ? 0  : (col.score ?? 0);
          let count = 0;
          answers.forEach(a => {
            if (typeof a.value === 'object' && a.value !== null)
              Object.values(a.value).forEach(v => { if (v === colText) count++; });
          });
          rows2.push({
            'Soru No': `S${qi+1}`,
            'Kategori': sanitizeExcelCell(cat),
            'Soru': sanitizeExcelCell(q.text),
            'Tür': 'Matris',
            'Seçenek': sanitizeExcelCell(colText),
            'Seçenek Puanı': colScore,
            'Seçilme Sayısı': count,
            'Toplam Puan': colScore * count,
            'Satır Sayısı': matrixRows.length,
          });
        });
      }
    });

    const ws2 = XLSX.utils.json_to_sheet(rows2);
    ws2['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 35 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Soru Puan Özeti');

    const rows3 = responses.map(resp => {
      const user = resp.user || {};
      const total = survey.questions.reduce((sum, q) => {
        const ans = resp.answers.find(a => a.question_id === q.id);
        return sum + (ans ? calcQuestionScore(q, ans.value) : 0);
      }, 0);
      return {
        'Ad Soyad':    sanitizeExcelCell(user.name  || 'Anonim'),
        'E-posta':     sanitizeExcelCell(user.email || ''),
        'Toplam Puan': total,
        'Tamamlanma':  resp.updated_at ? new Date(resp.updated_at).toLocaleString('tr-TR') : '',
        'Süre (sn)':   resp.duration_seconds || '',
      };
    }).sort((a, b) => b['Toplam Puan'] - a['Toplam Puan']);
    rows3.forEach((r, i) => { r['Sıra'] = i + 1; });

    const ws3 = XLSX.utils.json_to_sheet(rows3, { header: ['Sıra', 'Ad Soyad', 'E-posta', 'Toplam Puan', 'Tamamlanma', 'Süre (sn)'] });
    ws3['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Puan Sıralaması');

    const uniqueCats = [...new Set(survey.questions.map(q => q.category || 'Kategorisiz'))];
    const catQMap = {};
    uniqueCats.forEach(cat => {
      catQMap[cat] = survey.questions.filter(q => (q.category || 'Kategorisiz') === cat);
    });

    const rows4 = responses.map(resp => {
      const user = resp.user || {};
      const row  = {
        'Ad Soyad': sanitizeExcelCell(user.name || 'Anonim'),
        'E-posta': sanitizeExcelCell(user.email || '')
      };
      let grandTotal = 0;
      uniqueCats.forEach(cat => {
        let catScore = 0;
        catQMap[cat].forEach(q => {
          const ans = resp.answers.find(a => a.question_id === q.id);
          catScore += ans ? calcQuestionScore(q, ans.value) : 0;
        });
        row[`${cat} Puanı`] = catScore;
        grandTotal += catScore;
      });
      row['Toplam Puan'] = grandTotal;
      return row;
    }).sort((a, b) => b['Toplam Puan'] - a['Toplam Puan']);
    rows4.forEach((r, i) => { r['Sıra'] = i + 1; });

    const catHeaders = ['Sıra', 'Ad Soyad', 'E-posta', ...uniqueCats.map(c => `${c} Puanı`), 'Toplam Puan'];
    const ws4 = XLSX.utils.json_to_sheet(rows4, { header: catHeaders });
    ws4['!cols'] = [
      { wch: 6 }, { wch: 22 }, { wch: 28 },
      ...uniqueCats.map(() => ({ wch: 18 })),
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, ws4, 'Kategori Puanları');

    const rows5 = targets.map(t => ({
      'Ad Soyad':         sanitizeExcelCell(t.user?.name  || ''),
      'E-posta':          sanitizeExcelCell(t.user?.email || ''),
      'Gönderim Yöntemi': t.send_method || '',
      'Gönderilme':       t.sent_at      ? new Date(t.sent_at).toLocaleString('tr-TR')      : 'Henüz gönderilmedi',
      'Açılma':           t.opened_at    ? new Date(t.opened_at).toLocaleString('tr-TR')    : '—',
      'Tamamlanma':       t.completed_at ? new Date(t.completed_at).toLocaleString('tr-TR') : '—',
      'Durum':            t.completed_at ? 'Tamamlandı' : (t.opened_at ? 'Açıldı' : 'Gönderildi'),
    }));
    const ws5 = XLSX.utils.json_to_sheet(rows5);
    ws5['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws5, 'Gönderim Listesi');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeTitle = survey.title.replace(/[^a-z0-9ğüşıöçA-ZĞÜŞİÖÇ\s]/gi, '_');
    const filename = `${safeTitle}_rapor.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    logger.error('Survey excel export error:', err);
    return error(res, 'Excel raporu oluşturulurken bir hata oluştu');
  }
};

// Birim testler ve modüler kullanım için dışa aktarma
exports.calcQuestionScore = calcQuestionScore;
exports.buildScoreTable = buildScoreTable;
exports.findScore = findScore;
exports.parseDate = parseDate;
exports.sanitizeExcelCell = sanitizeExcelCell;
