const { Setting } = require('../models');

const DEFAULTS = {
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
  whatsapp_api_url: process.env.WHATSAPP_API_URL || 'http://whatsapp.noktabilisim.net:3000/send-message',
  // SMS
  sms_api_url:  process.env.SMS_API_URL  || 'http://smsportal.noktabilisim.net:3001',
  sms_api_key:  process.env.SMS_API_KEY  || '9c0a341a3713db45c5f1786bcee5e270f672d0e42666510d',
  sms_header:   process.env.SMS_HEADER   || 'NOKTABLSM',
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

async function saveSettings(pairs) {
  for (const [key, value] of Object.entries(pairs)) {
    await Setting.upsert({ key, value: String(value ?? '') });
  }
}

module.exports = { getAllSettings, getSetting, saveSettings };
