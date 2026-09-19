const path = require('path');
const fs = require('fs');
const { Setting } = require('../models');
const logger = require('../utils/logger');

const DEFAULTS = {
  // Kurumsal Marka & Logo
  app_logo:        process.env.APP_LOGO        || '',
  app_title:       process.env.APP_TITLE       || 'SurveyPro',
  smtp_host:       process.env.SMTP_HOST       || 'smtp.gmail.com',
  smtp_port:       process.env.SMTP_PORT       || '587',
  smtp_user:       process.env.SMTP_USER       || '',
  smtp_pass:       process.env.SMTP_PASS       || '',
  smtp_ssl:        process.env.SMTP_SSL        || 'false',
  smtp_auth:       process.env.SMTP_AUTH       || 'true',
  smtp_from_name:  process.env.SMTP_FROM_NAME  || 'SurveyPro',
  smtp_from_email: process.env.SMTP_FROM_EMAIL || (process.env.SMTP_USER || ''),
  // Site URL — mesajlardaki anket linki buradan üretilir
  site_url: process.env.FRONTEND_URL || 'http://localhost:3000',
  // WhatsApp
  whatsapp_api_url: process.env.WHATSAPP_API_URL || '',
  // SMS
  sms_api_url:  process.env.SMS_API_URL  || '',
  sms_api_key:  process.env.SMS_API_KEY  || '',
  sms_header:   process.env.SMS_HEADER   || '',
};

async function getAllSettings() {
  const rows = await Setting.findAll();
  const map  = { ...DEFAULTS };
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

async function getSetting(key) {
  const row = await Setting.findOne({ where: { key } });
  return row ? row.value : (DEFAULTS[key] ?? null);
}

async function getPublicSettings() {
  const keys = ['app_logo', 'app_title', 'site_url'];
  const rows = await Setting.findAll({
    where: { key: keys }
  });

  const map = {
    app_logo: DEFAULTS.app_logo || null,
    app_title: DEFAULTS.app_title || 'SurveyPro',
    site_url: DEFAULTS.site_url || 'http://localhost:3000'
  };

  rows.forEach(r => {
    if (r.key === 'app_logo') {
      map.app_logo = r.value && r.value.trim() !== '' ? r.value : null;
    } else if (r.value !== undefined && r.value !== null) {
      map[r.key] = r.value;
    }
  });

  return map;
}

async function saveSettings(pairs) {
  for (const [key, value] of Object.entries(pairs)) {
    await Setting.upsert({ key, value: String(value ?? '') });
  }
}

async function removeLogoFile(logoPath) {
  if (!logoPath || typeof logoPath !== 'string') return;
  try {
    const filename = path.basename(logoPath);
    if (!filename || filename === '.' || filename === '/') return;
    const uploadBase = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.resolve(__dirname, '../../uploads/logos');
    const fullPath = path.join(uploadBase, filename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (err) {
    logger.warn(`Logo dosyası silinirken hata: ${err.message}`);
  }
}

async function deleteLogo() {
  const currentLogo = await getSetting('app_logo');
  if (currentLogo) {
    await removeLogoFile(currentLogo);
  }
  await Setting.upsert({ key: 'app_logo', value: '' });
  return true;
}

module.exports = {
  getAllSettings,
  getSetting,
  getPublicSettings,
  saveSettings,
  removeLogoFile,
  deleteLogo,
  DEFAULTS
};
