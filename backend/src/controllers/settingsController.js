const { getAllSettings, saveSettings } = require('../services/settingsService');
const { testSmtp, sendTestEmail, testWhatsApp, testSms } = require('../services/notificationService');
const { success, error } = require('../utils/response');
const { isValidEmail } = require('../utils/validate');
const logger = require('../utils/logger');

const SENSITIVE = ['smtp_pass', 'sms_api_key'];

exports.get = async (req, res) => {
  try {
    const all  = await getAllSettings();
    const safe = Object.fromEntries(
      Object.entries(all).map(([k, v]) =>
        SENSITIVE.includes(k) && v ? [k, '••••••••'] : [k, v]
      )
    );
    return success(res, safe);
  } catch (err) {
    logger.error('Settings get error:', err);
    return error(res, 'Ayarlar yüklenirken bir hata oluştu');
  }
};

exports.save = async (req, res) => {
  try {
    const allowed = [
      'site_url',
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
      'smtp_ssl', 'smtp_auth', 'smtp_from_name', 'smtp_from_email',
      'whatsapp_api_url',
      'sms_api_url', 'sms_api_key', 'sms_header',
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
  } catch (err) {
    logger.error('Settings save error:', err);
    return error(res, 'Ayarlar kaydedilirken bir hata oluştu');
  }
};

exports.testConnection = async (req, res) => {
  try {
    await testSmtp();
    return success(res, { message: 'SMTP sunucusuna bağlantı başarılı' });
  } catch (err) {
    logger.error('Settings testConnection error:', err);
    return error(res, `SMTP bağlantı hatası: ${err.message}`, 400);
  }
};

exports.sendTestEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to || !isValidEmail(to)) {
      return error(res, 'Geçerli bir alıcı e-posta adresi gereklidir', 400);
    }
    await sendTestEmail(to);
    return success(res, { message: `Test e-postası ${to} adresine gönderildi` });
  } catch (err) {
    logger.error('Settings sendTestEmail error:', err);
    return error(res, `E-posta gönderilemedi: ${err.message}`, 400);
  }
};

exports.sendTestWhatsApp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return error(res, 'Geçerli bir telefon numarası gereklidir', 400);
    }
    await testWhatsApp(phone);
    return success(res, { message: `WhatsApp test mesajı ${phone} numarasına gönderildi` });
  } catch (err) {
    logger.error('Settings sendTestWhatsApp error:', err);
    return error(res, `WhatsApp gönderilemedi: ${err.message}`, 400);
  }
};

exports.sendTestSms = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return error(res, 'Geçerli bir telefon numarası gereklidir', 400);
    }
    await testSms(phone);
    return success(res, { message: `Test SMS ${phone} numarasına gönderildi` });
  } catch (err) {
    logger.error('Settings sendTestSms error:', err);
    return error(res, `SMS gönderilemedi: ${err.message}`, 400);
  }
};
