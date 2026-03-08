const { Setting } = require('../models');

// Varsayılan SMTP ayarları (DB boşsa .env'den düşer)
const DEFAULTS = {
  smtp_host:     process.env.SMTP_HOST     || 'smtp.gmail.com',
  smtp_port:     process.env.SMTP_PORT     || '587',
  smtp_user:     process.env.SMTP_USER     || '',
  smtp_pass:     process.env.SMTP_PASS     || '',
  smtp_ssl:      process.env.SMTP_SSL      || 'false',
  smtp_auth:     process.env.SMTP_AUTH     || 'true',
  smtp_from_name:  process.env.SMTP_FROM_NAME  || 'SurveyPro',
  smtp_from_email: process.env.SMTP_FROM_EMAIL || (process.env.SMTP_USER || ''),
};

/**
 * Tüm ayarları key→value map olarak döner.
 * DB'de yoksa .env / varsayılan değer kullanılır.
 */
async function getAllSettings() {
  const rows = await Setting.findAll();
  const map = { ...DEFAULTS };
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

/**
 * Tek bir ayarı döner.
 */
async function getSetting(key) {
  const row = await Setting.findOne({ where: { key } });
  return row ? row.value : (DEFAULTS[key] ?? null);
}

/**
 * Birden fazla ayarı toplu kaydeder (upsert).
 */
async function saveSettings(pairs) {
  for (const [key, value] of Object.entries(pairs)) {
    await Setting.upsert({ key, value: String(value ?? '') });
  }
}

module.exports = { getAllSettings, getSetting, saveSettings };
