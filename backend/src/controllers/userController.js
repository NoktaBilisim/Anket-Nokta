const bcrypt = require('bcryptjs');
const { User, ActivityLog, sequelize } = require('../models');
const { success, error } = require('../utils/response');
const {
  validateUserCreate,
  validateChangePassword,
  isValidUUID,
  isValidEmail,
  VALID_ROLES
} = require('../utils/validate');
const logger = require('../utils/logger');

exports.list = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'refresh_token'] },
      order: [['created_at', 'DESC']]
    });
    return success(res, users);
  } catch (err) {
    logger.error('User list error:', err);
    return error(res, 'Kullanıcılar listelenirken bir hata oluştu');
  }
};

exports.create = async (req, res) => {
  try {
    const { error: valError } = validateUserCreate(req.body);
    if (valError) return error(res, valError, 400);

    const { name, email, password, role, phone, whatsapp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const exists = await User.findOne({ where: { email: normalizedEmail } });
    if (exists) return error(res, 'Bu e-posta zaten kayıtlı', 400);

    const hash = await bcrypt.hash(password || 'Welcome123!', 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hash,
      role: role || 'participant',
      phone: phone ? phone.trim() : null,
      whatsapp: whatsapp ? whatsapp.trim() : null
    });

    await ActivityLog.create({
      user_id: req.user.id,
      action: 'user_created',
      metadata: { targetEmail: normalizedEmail },
      ip_address: req.ip
    });

    const { password: _, refresh_token: __, ...safe } = user.toJSON();
    return success(res, safe, 201);
  } catch (err) {
    logger.error('User create error:', err);
    return error(res, 'Kullanıcı oluşturulurken bir hata oluştu');
  }
};

exports.update = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz kullanıcı ID formatı', 400);
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'Kullanıcı bulunamadı', 404);

    const { name, role, phone, whatsapp, is_active, password } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) return error(res, 'Geçersiz rol', 400);
      updateData.role = role;
    }
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp ? whatsapp.trim() : null;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    if (password && password.trim().length > 0) {
      if (password.length < 6) return error(res, 'Şifre en az 6 karakter olmalıdır', 400);
      updateData.password = await bcrypt.hash(password, 12);
    }

    await user.update(updateData);

    await ActivityLog.create({
      user_id: req.user.id,
      action: 'user_updated',
      metadata: { targetId: user.id, targetEmail: user.email },
      ip_address: req.ip
    });

    const { password: _, refresh_token: __, ...safe } = user.toJSON();
    return success(res, safe);
  } catch (err) {
    logger.error('User update error:', err);
    return error(res, 'Kullanıcı güncellenirken bir hata oluştu');
  }
};

exports.remove = async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return error(res, 'Geçersiz kullanıcı ID formatı', 400);
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'Kullanıcı bulunamadı', 404);
    if (user.id === req.user.id) return error(res, 'Kendinizi silemezsiniz', 400);

    await ActivityLog.create({
      user_id: req.user.id,
      action: 'user_deleted',
      metadata: { targetEmail: user.email },
      ip_address: req.ip
    });

    await user.destroy();
    return success(res, { message: 'Kullanıcı silindi' });
  } catch (err) {
    logger.error('User remove error:', err);
    return error(res, 'Kullanıcı silinirken bir hata oluştu');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, whatsapp } = req.body;
    const updateData = {};
    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp ? whatsapp.trim() : null;

    await req.user.update(updateData);
    const { password: _, refresh_token: __, ...safe } = req.user.toJSON();
    return success(res, safe);
  } catch (err) {
    logger.error('User updateProfile error:', err);
    return error(res, 'Profil güncellenirken bir hata oluştu');
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { error: valError } = validateChangePassword(req.body);
    if (valError) return error(res, valError, 400);

    const { currentPassword, newPassword } = req.body;
    if (!(await bcrypt.compare(currentPassword, req.user.password))) {
      return error(res, 'Mevcut şifre yanlış', 400);
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await req.user.update({ password: hash });
    return success(res, { message: 'Şifre güncellendi' });
  } catch (err) {
    logger.error('User changePassword error:', err);
    return error(res, 'Şifre değiştirilirken bir hata oluştu');
  }
};

// ─── Excel / CSV toplu yükleme ────────────────────────────────────────────────
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) return error(res, 'Dosya yüklenmedi', 400);

    let rows = [];

    // xlsx veya csv parse
    if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      const text = req.file.buffer.toString('utf8');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return error(res, 'CSV dosyası boş veya başlıksız', 400);
      const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        const obj = {};
        header.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
        rows.push(obj);
      }
    } else {
      const XLSX = require('xlsx');
      const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
      if (!wb.SheetNames || wb.SheetNames.length === 0) return error(res, 'Excel sayfası bulunamadı', 400);
      const ws   = wb.Sheets[wb.SheetNames[0]];
      rows       = XLSX.utils.sheet_to_json(ws, { defval: '' });
      rows = rows.map(r =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim().toLowerCase(), String(v).trim()]))
      );
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
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

      if (!isValidEmail(email)) {
        results.errors.push(`Geçersiz e-posta: ${email}`);
        results.skipped++;
        continue;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const exists = await User.findOne({ where: { email: normalizedEmail } });
      if (exists) {
        results.errors.push(`Zaten kayıtlı, atlandı: ${normalizedEmail}`);
        results.skipped++;
        continue;
      }

      const hash = await bcrypt.hash(password, 12);
      await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hash,
        role,
        phone: phone ? phone.trim() : null,
        whatsapp: whatsapp ? whatsapp.trim() : null,
        is_active: true
      });
      results.created++;
    }

    await ActivityLog.create({
      user_id: req.user.id,
      action: 'user_created',
      metadata: { bulk: true, created: results.created, skipped: results.skipped },
      ip_address: req.ip
    });

    return success(res, results);
  } catch (err) {
    logger.error('User importExcel error:', err);
    return error(res, 'İçe aktarma sırasında bir hata oluştu', 500);
  }
};
