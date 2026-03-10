const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'refresh_token'] },
      order: [['created_at', 'DESC']]
    });
    return success(res, users);
  } catch (err) { return error(res, err.message); }
};

exports.create = async (req, res) => {
  try {
    const { name, email, password, role, phone, whatsapp } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return error(res, 'Bu e-posta zaten kayıtlı', 400);
    const hash = await bcrypt.hash(password || 'Welcome123!', 12);
    const user = await User.create({ name, email, password: hash, role, phone, whatsapp });
    await ActivityLog.create({
      user_id: req.user.id, action: 'user_created',
      metadata: { targetEmail: email }, ip_address: req.ip
    });
    const { password: _, refresh_token: __, ...safe } = user.toJSON();
    return success(res, safe, 201);
  } catch (err) { return error(res, err.message); }
};

exports.update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'Kullanıcı bulunamadı', 404);
    const { name, role, phone, whatsapp, is_active, password } = req.body;
    const updateData = { name, role, phone, whatsapp, is_active };
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    await user.update(updateData);
    await ActivityLog.create({
      user_id: req.user.id, action: 'user_updated',
      metadata: { targetId: user.id, targetEmail: user.email }, ip_address: req.ip
    });
    const { password: _, refresh_token: __, ...safe } = user.toJSON();
    return success(res, safe);
  } catch (err) { return error(res, err.message); }
};

exports.remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'Kullanıcı bulunamadı', 404);
    if (user.id === req.user.id) return error(res, 'Kendinizi silemezsiniz', 400);
    await ActivityLog.create({
      user_id: req.user.id, action: 'user_deleted',
      metadata: { targetEmail: user.email }, ip_address: req.ip
    });
    await user.destroy();
    return success(res, { message: 'Kullanıcı silindi' });
  } catch (err) { return error(res, err.message); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, whatsapp } = req.body;
    await req.user.update({ name, phone, whatsapp });
    const { password: _, refresh_token: __, ...safe } = req.user.toJSON();
    return success(res, safe);
  } catch (err) { return error(res, err.message); }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!(await bcrypt.compare(currentPassword, req.user.password)))
      return error(res, 'Mevcut şifre yanlış', 400);
    const hash = await bcrypt.hash(newPassword, 12);
    await req.user.update({ password: hash });
    return success(res, { message: 'Şifre güncellendi' });
  } catch (err) { return error(res, err.message); }
};

// ─── Excel / CSV toplu yükleme ────────────────────────────────────────────────
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) return error(res, 'Dosya yüklenmedi', 400);

    let rows = [];

    // xlsx veya csv parse
    if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      // CSV — basit satır parse
      const text = req.file.buffer.toString('utf8');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        const obj = {};
        header.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
        rows.push(obj);
      }
    } else {
      // XLSX — xlsx paketi
      const XLSX = require('xlsx');
      const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      rows       = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Başlıkları küçük harfe normalize et
      rows = rows.map(r =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim().toLowerCase(), String(v).trim()]))
      );
    }

    const VALID_ROLES = ['admin', 'creator', 'evaluator', 'participant'];
    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      // Sütun adı esnekliği: name/ad, email/eposta, phone/telefon vb.
      const name     = row['name']     || row['ad']      || row['isim']    || '';
      const email    = row['email']    || row['eposta']  || row['e-posta'] || '';
      const phone    = row['phone']    || row['telefon'] || row['gsm']     || '';
      const whatsapp = row['whatsapp'] || row['wp']      || '';
      const roleRaw  = row['role']     || row['rol']     || 'participant';
      const role     = VALID_ROLES.includes(roleRaw.toLowerCase()) ? roleRaw.toLowerCase() : 'participant';
      const password = row['password'] || row['sifre']   || row['şifre']  || 'Welcome123!';

      if (!name || !email) {
        results.errors.push(`Satır atlandı: ad veya e-posta boş (${email || '?'})`);
        results.skipped++;
        continue;
      }

      // E-posta format kontrolü
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.errors.push(`Geçersiz e-posta: ${email}`);
        results.skipped++;
        continue;
      }

      // Zaten kayıtlı mı?
      const exists = await User.findOne({ where: { email: email.toLowerCase() } });
      if (exists) {
        results.errors.push(`Zaten kayıtlı, atlandı: ${email}`);
        results.skipped++;
        continue;
      }

      const hash = await bcrypt.hash(password, 12);
      await User.create({
        name, email: email.toLowerCase(), password: hash,
        role, phone, whatsapp, is_active: true
      });
      results.created++;
    }

    await ActivityLog.create({
      user_id: req.user.id, action: 'user_created',
      metadata: { bulk: true, created: results.created, skipped: results.skipped },
      ip_address: req.ip
    });

    return success(res, results);
  } catch (err) {
    return error(res, `İçe aktarma hatası: ${err.message}`, 500);
  }
};
