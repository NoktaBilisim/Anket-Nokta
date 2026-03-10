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

// ── Seçenek puanını bul ───────────────────────────────────────────────────────
function findScore(options, selectedValue) {
  if (!Array.isArray(options)) return 0;
  const opt = options.find(o => {
    const text = typeof o === 'string' ? o : o.text;
    return text === selectedValue;
  });
  if (!opt) return 0;
  return typeof opt === 'string' ? 0 : (opt.score ?? 0);
}

// ── Soru puanı hesapla ────────────────────────────────────────────────────────
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

// ── Puan tablosunu oluştur ────────────────────────────────────────────────────
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

exports.create = async (req, res) => {
  try {
    const { title, description, anonymous, expires_at, questions } = req.body;
    const survey = await Survey.create({
      title, description, anonymous,
      expires_at: parseDate(expires_at),
      created_by: req.user.id, status: 'draft'
    });
    if (questions?.length) {
      await Question.bulkCreate(questions.map((q, i) => ({
        ...q,
        category: q.category || null,
        survey_id: survey.id,
        order: i
      })));
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
      await Question.bulkCreate(questions.map((q, i) => ({
        ...q,
        category: q.category || null,
        survey_id: survey.id,
        order: i
      })));
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

    if (results.sent === 0 && results.failed.length > 0)
      return error(res, `Gönderilemedi: ${results.failed[0].error}`, 400);

    return success(res, {
      sent: results.sent, failed: results.failed,
      message: results.failed.length > 0
        ? `${results.sent} gönderildi, ${results.failed.length} başarısız`
        : `${results.sent} kişiye başarıyla gönderildi`
    });
  } catch (err) { return error(res, err.message); }
};

// ── Rapor ─────────────────────────────────────────────────────────────────────
exports.report = async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id, {
      include: [{ model: Question, as: 'questions', order: [['order', 'ASC']] }]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);

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

    // ── Kişi bazlı puan tablosu ──────────────────────────────────────────────
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

    // ── Soru bazlı istatistikler ─────────────────────────────────────────────
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

    // ── Kategori bazlı puan özeti ─────────────────────────────────────────────
    const categoryMap = {};
    survey.questions.forEach(q => {
      const cat = q.category || 'Kategorisiz';
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, questions: [], totalScoreSum: 0, questionCount: 0 };
      categoryMap[cat].questions.push(q.id);
      categoryMap[cat].questionCount++;
    });

    // Her kategorinin toplam puanını hesapla
    Object.values(categoryMap).forEach(catInfo => {
      const catQuestions = survey.questions.filter(q => catInfo.questions.includes(q.id));
      catInfo.totalScoreSum = questionStats
        .filter(qs => catInfo.questions.includes(qs.question.id))
        .reduce((s, qs) => s + (qs.stats.totalScoreSum || 0), 0);
    });

    // Kişi başı kategori puanları
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

    // Tüm anket kategorilerini liste olarak döndür
    const categories = [...new Set(survey.questions.map(q => q.category).filter(Boolean))];

    return success(res, {
      survey, sent, opened, completed,
      responseRate: sent ? Math.round((completed / sent) * 100) : 0,
      questionStats,
      userScores: userCategoryScores,
      categoryMap,
      categories,
      totalScoreAll,
      avgScore,
    });
  } catch (err) { return error(res, err.message); }
};

// ── Excel Export ──────────────────────────────────────────────────────────────
exports.exportExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const survey = await Survey.findByPk(req.params.id, {
      include: [{ model: Question, as: 'questions', order: [['order', 'ASC']] }]
    });
    if (!survey) return error(res, 'Anket bulunamadı', 404);

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

    // ── 1. Sayfa: Katılımcı Yanıtları + Puanlar ──────────────────────────────
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
        'Ad Soyad':   user.name  || 'Anonim',
        'E-posta':    user.email || '',
        'Tamamlanma': resp.updated_at ? new Date(resp.updated_at).toLocaleString('tr-TR') : '',
        'Süre (sn)':  resp.duration_seconds || '',
      };
      questionHeaders.forEach((h, i) => { row[h] = answerVals[i] });
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

    // ── 2. Sayfa: Soru Puan Özeti ─────────────────────────────────────────────
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
            'Soru No': `S${qi+1}`, 'Kategori': cat, 'Soru': q.text,
            'Tür': q.type === 'yes_no' ? 'Evet/Hayır' : 'Çoktan Seçmeli',
            'Seçenek': text, 'Seçenek Puanı': score,
            'Seçilme Sayısı': count, 'Toplam Puan': score * count,
          });
        });
      } else if (q.type === 'rating') {
        const vals = answers.map(a => Number(a.value)).filter(Boolean);
        const avg  = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : 0;
        rows2.push({
          'Soru No': `S${qi+1}`, 'Kategori': cat, 'Soru': q.text, 'Tür': 'Puanlama',
          'Seçenek': '—', 'Seçenek Puanı': '—',
          'Seçilme Sayısı': vals.length,
          'Toplam Puan': vals.reduce((s, v) => s + v, 0), 'Ortalama': avg,
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
            'Soru No': `S${qi+1}`, 'Kategori': cat, 'Soru': q.text, 'Tür': 'Matris',
            'Seçenek': colText, 'Seçenek Puanı': colScore,
            'Seçilme Sayısı': count, 'Toplam Puan': colScore * count,
            'Satır Sayısı': matrixRows.length,
          });
        });
      }
    });

    const ws2 = XLSX.utils.json_to_sheet(rows2);
    ws2['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 35 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Soru Puan Özeti');

    // ── 3. Sayfa: Kişi Puan Sıralaması ───────────────────────────────────────
    const rows3 = responses.map(resp => {
      const user = resp.user || {};
      const total = survey.questions.reduce((sum, q) => {
        const ans = resp.answers.find(a => a.question_id === q.id);
        return sum + (ans ? calcQuestionScore(q, ans.value) : 0);
      }, 0);
      return {
        'Ad Soyad':    user.name  || 'Anonim',
        'E-posta':     user.email || '',
        'Toplam Puan': total,
        'Tamamlanma':  resp.updated_at ? new Date(resp.updated_at).toLocaleString('tr-TR') : '',
        'Süre (sn)':   resp.duration_seconds || '',
      };
    }).sort((a, b) => b['Toplam Puan'] - a['Toplam Puan']);
    rows3.forEach((r, i) => { r['Sıra'] = i + 1; });

    const ws3 = XLSX.utils.json_to_sheet(rows3, { header: ['Sıra', 'Ad Soyad', 'E-posta', 'Toplam Puan', 'Tamamlanma', 'Süre (sn)'] });
    ws3['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Puan Sıralaması');

    // ── 4. Sayfa: Kategori Puan Özeti ─────────────────────────────────────────
    // Kategoriler varsa sayfa oluştur
    const uniqueCats = [...new Set(survey.questions.map(q => q.category || 'Kategorisiz'))];
    const catQMap = {};
    uniqueCats.forEach(cat => {
      catQMap[cat] = survey.questions.filter(q => (q.category || 'Kategorisiz') === cat);
    });

    // Her kişi için kategori puanları
    const rows4 = responses.map(resp => {
      const user = resp.user || {};
      const row  = { 'Ad Soyad': user.name || 'Anonim', 'E-posta': user.email || '' };
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

    // ── 5. Sayfa: Gönderim Listesi ────────────────────────────────────────────
    const rows5 = targets.map(t => ({
      'Ad Soyad':         t.user?.name  || '',
      'E-posta':          t.user?.email || '',
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
    const filename = `${survey.title.replace(/[^a-z0-9ğüşıöçA-ZĞÜŞİÖÇ\s]/gi, '_')}_rapor.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    return error(res, `Excel oluşturulamadı: ${err.message}`, 500);
  }
};
