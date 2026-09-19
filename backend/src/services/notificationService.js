const nodemailer = require('nodemailer');
const { getAllSettings } = require('./settingsService');
const logger = require('../utils/logger');

// ─── Telefon numarası normalizasyonu (SMS için) ──────────────────────────────
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('90')) return cleaned.slice(2);
  return cleaned.replace(/^0/, '');
}

// ─── Anket linkini DB ayarından üret ─────────────────────────────────────────
async function buildLink(token, s) {
  const base = (s.site_url || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/survey/${token}`;
}

// ─── SMS (noktabilisim.net) ────────────────────────────────────────────────────
async function sendSmsHttp(phone, message, header, s) {
  const url = (s.sms_api_url || process.env.SMS_API_URL || 'http://smsportal.noktabilisim.net:3001') + '/api/external/send-sms';
  const key = s.sms_api_key || process.env.SMS_API_KEY || '';

  const phoneNum = normalizePhone(phone);
  logger.info(`[SMS] Gönderiliyor → ${phoneNum}`);

  const body = { phone: phoneNum, message };
  const trimmedHeader = (header || '').trim();
  if (trimmedHeader) body.header = trimmedHeader;

  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(15000),
  });

  const text = await resp.text().catch(() => '');
  let result;
  try { result = JSON.parse(text); } catch { result = { raw: text }; }

  if (!resp.ok) throw new Error(`SMS API hatası: HTTP ${resp.status} — ${text}`);

  logger.info(`[SMS] Gönderildi ✓`);
  return result;
}

// ─── WhatsApp (noktabilisim.net) ──────────────────────────────────────────────
async function sendWhatsAppHttp(phone, message, s) {
  const url = s.whatsapp_api_url || process.env.WHATSAPP_API_URL || 'http://whatsapp.noktabilisim.net:3000/send-message';

  const normalized  = (phone || '').replace(/[\s\-\(\)]/g, '');
  const phoneNumber = normalized.startsWith('+') ? normalized : `+${normalized}`;

  logger.info(`[WA] Gönderiliyor → ${phoneNumber}`);

  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ phoneNumber, message }),
    signal:  AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`WhatsApp API hatası: HTTP ${resp.status} — ${body}`);
  }

  const result = await resp.json().catch(() => ({}));
  logger.info(`[WA] Gönderildi ✓`);
  return result;
}

// ─── SMTP transporter ─────────────────────────────────────────────────────────
async function createTransporter(s) {
  const useSSL  = s.smtp_ssl  === 'true';
  const useAuth = s.smtp_auth === 'true';
  const port    = parseInt(s.smtp_port, 10) || (useSSL ? 465 : 587);

  return nodemailer.createTransport({
    host: s.smtp_host, port, secure: useSSL,
    auth: useAuth ? { user: s.smtp_user, pass: s.smtp_pass } : undefined,
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });
}

// ─── E-posta HTML şablonu (Truguard logolu) ───────────────────────────────────
function buildHtml(surveyTitle, surveyDescription, link, fromName, siteUrl) {
  const base    = (siteUrl || '').replace(/\/$/, '');
  const logoUrl = base ? `${base}/Truguard_logo.png` : '';
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

      <!-- Üst banner -->
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;text-align:center">
        ${logoUrl
          ? `<img src="${logoUrl}" alt="Truguard" style="height:48px;width:auto;object-fit:contain;display:block;margin:0 auto" />`
          : `<p style="color:white;font-size:20px;font-weight:700;margin:0">${fromName}</p>`
        }
      </div>

      <!-- İçerik -->
      <div style="padding:32px">
        <h2 style="color:#1f2937;font-size:20px;margin:0 0 10px 0">${surveyTitle}</h2>
        ${surveyDescription ? `<p style="color:#6b7280;font-size:15px;margin:0 0 24px 0;line-height:1.6">${surveyDescription}</p>` : '<div style="height:16px"></div>'}

        <div style="text-align:center;margin:8px 0 28px 0">
          <a href="${link}"
             style="display:inline-block;background:#4f46e5;color:white;
                    padding:14px 36px;border-radius:10px;text-decoration:none;
                    font-weight:600;font-size:16px;letter-spacing:0.3px">
            Anketi Doldur →
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;border-top:1px solid #f3f4f6;padding-top:20px">
          Bu e-postayı <strong>${fromName}</strong> sistemi üzerinden aldınız.<br>
          Beklemediniz mi? Bu e-postayı görmezden gelebilirsiniz.
        </p>
      </div>
    </div>`;
}

// ─── Ana gönderim fonksiyonu ──────────────────────────────────────────────────
exports.send = async (method, user, survey, token) => {
  const s    = await getAllSettings();
  const link = await buildLink(token, s);

  logger.info(`[NOTIFY] method=${method} link=${link}`);

  // ── E-posta ─────────────────────────────────────────────────────────────────
  if (method === 'email') {
    if (!user.email) throw new Error(`Kullanıcının e-posta adresi yok: ${user.name}`);
    const transporter = await createTransporter(s);
    const fromEmail   = s.smtp_from_email || s.smtp_user;
    const fromName    = s.smtp_from_name  || 'SurveyPro';
    const info = await transporter.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to:      user.email,
      subject: `Anket: ${survey.title}`,
      html:    buildHtml(survey.title, survey.description, link, fromName, s.site_url),
      text:    `${survey.title}\n\nAnketi doldurmak için: ${link}`,
    });
    logger.info(`[EMAIL] Gönderildi ✓ messageId: ${info.messageId}`);
    return info;
  }

  // ── SMS ──────────────────────────────────────────────────────────────────────
  if (method === 'sms') {
    if (!user.phone) throw new Error(`Kullanıcının telefon numarası yok: ${user.name}`);
    const header  = (s.sms_header || '').trim();
    const message = `${survey.title}\nAnketi doldurmak icin: ${link}`;
    return sendSmsHttp(user.phone, message, header, s);
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  if (method === 'whatsapp') {
    const phone = user.whatsapp || user.phone;
    if (!phone) throw new Error(`Kullanıcının WhatsApp/telefon numarası yok: ${user.name}`);
    const message =
      `📋 *${survey.title}*\n` +
      (survey.description ? `${survey.description}\n\n` : '\n') +
      `Anketi doldurmak için:\n${link}`;
    return sendWhatsAppHttp(phone, message, s);
  }

  throw new Error(`Bilinmeyen gönderim yöntemi: ${method}`);
};

// ─── SMTP bağlantı testi ──────────────────────────────────────────────────────
exports.testSmtp = async () => {
  const s = await getAllSettings();
  const transporter = await createTransporter(s);
  await transporter.verify();
  return true;
};

// ─── Test e-postası ───────────────────────────────────────────────────────────
exports.sendTestEmail = async (to) => {
  const s           = await getAllSettings();
  const transporter = await createTransporter(s);
  const fromEmail   = s.smtp_from_email || s.smtp_user;
  const fromName    = s.smtp_from_name  || 'SurveyPro';
  const base        = (s.site_url || '').replace(/\/$/, '');
  const logoUrl     = base ? `${base}/Truguard_logo.png` : '';
  const info = await transporter.sendMail({
    from:    `"${fromName}" <${fromEmail}>`,
    to,
    subject: `SurveyPro — Test E-postası`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;text-align:center">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="Truguard" style="height:40px;width:auto;display:block;margin:0 auto" />`
            : `<p style="color:white;font-weight:700;margin:0">${fromName}</p>`
          }
        </div>
        <div style="padding:28px">
          <h2 style="color:#4f46e5;margin:0 0 12px 0">✓ SMTP Ayarları Çalışıyor</h2>
          <p style="color:#374151;margin:0 0 16px 0">Bu e-posta SurveyPro SMTP yapılandırmanızın doğru çalıştığını teyit eder.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
          <p style="color:#6b7280;font-size:13px;margin:0">
            Sunucu: <strong>${s.smtp_host}:${s.smtp_port}</strong><br>
            SSL: <strong>${s.smtp_ssl === 'true' ? 'Aktif' : 'Pasif'}</strong><br>
            Gönderen: <strong>${fromEmail}</strong><br>
            Site URL: <strong>${s.site_url || 'tanımsız'}</strong>
          </p>
        </div>
      </div>`,
    text: 'SurveyPro SMTP test e-postası. Yapılandırma başarılı.',
  });
  logger.info(`[TEST EMAIL] Gönderildi ✓ messageId: ${info.messageId}`);
  return info;
};

// ─── WhatsApp test ────────────────────────────────────────────────────────────
exports.testWhatsApp = async (phone) => {
  const s    = await getAllSettings();
  const base = (s.site_url || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const link = `${base}/survey/test-token`;
  const message = `📋 *SurveyPro Test*\n\nBu bir test mesajıdır. WhatsApp entegrasyonu başarıyla çalışıyor.\nAnket bağlantısı: ${link}`;
  return sendWhatsAppHttp(phone, message, s);
};

// ─── SMS test ─────────────────────────────────────────────────────────────────
exports.testSms = async (phone) => {
  const s      = await getAllSettings();
  const base   = (s.site_url || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const link   = `${base}/survey/test-token`;
  const header = (s.sms_header || '').trim();
  const message = `SurveyPro Test: SMS entegrasyonu basariyla calisiyor. Anket linki: ${link}`;
  return sendSmsHttp(phone, message, header, s);
};

exports.normalizePhone = normalizePhone;
exports.buildHtml = buildHtml;
exports.buildLink = buildLink;
