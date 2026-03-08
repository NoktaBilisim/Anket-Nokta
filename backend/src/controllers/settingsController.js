const { getAllSettings, saveSettings } = require('../services/settingsService');
const { testSmtp, sendTestEmail } = require('../services/notificationService');
const { success, error } = require('../utils/response');

const SENSITIVE = ['smtp_pass'];

exports.get = async (req, res) => {
  try {
    const all = await getAllSettings();
    const safe = Object.fromEntries(
      Object.entries(all).map(([k, v]) =>
        SENSITIVE.includes(k) && v ? [k, '••••••••'] : [k, v]
      )
    );
    return success(res, safe);
  } catch (err) { return error(res, err.message); }
};

exports.save = async (req, res) => {
  try {
    const allowed = [
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
      'smtp_ssl', 'smtp_auth', 'smtp_from_name', 'smtp_from_email'
    ];
    const pairs = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (SENSITIVE.includes(key) && req.body[key] === '••••••••') continue;
        pairs[key] = req.body[key];
      }
    }
    await saveSettings(pairs);
    return success(res, { message: 'Ayarlar kaydedildi' });
  } catch (err) { return error(res, err.message); }
};

// Sadece bağlantı testi (verify)
exports.testConnection = async (req, res) => {
  try {
    await testSmtp();
    return success(res, { message: 'SMTP sunucusuna bağlantı başarılı ✓' });
  } catch (err) {
    return error(res, `SMTP bağlantı hatası: ${err.message}`, 400);
  }
};

// Gerçek test e-postası gönderir
exports.sendTestEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return error(res, 'Alıcı e-posta adresi gerekli', 400);
    await sendTestEmail(to);
    return success(res, { message: `Test e-postası ${to} adresine gönderildi ✓` });
  } catch (err) {
    return error(res, `E-posta gönderilemedi: ${err.message}`, 400);
  }
};
