const nodemailer = require('nodemailer');
const { getAllSettings } = require('./settingsService');

// ─── Anket linkini DB ayarından üret ─────────────────────────────────────────
async function buildLink(token, s) {
  // Öncelik: DB'deki site_url → env FRONTEND_URL → localhost
  const base = (s.site_url || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/survey/${token}`;
}

// ─── SMS (noktabilisim.net) ────────────────────────────────────────────────────
async function sendSmsHttp(phone, message, header, s) {
  const url = (s.sms_api_url || process.env.SMS_API_URL || 'http://smsportal.noktabilisim.net:3001') + '/api/external/send-sms';
  const key = s.sms_api_key || process.env.SMS_API_KEY || '';

  const normalized = phone.replace(/[\s\-\(\)\+]/g, '');
  const phoneNum   = normalized.startsWith('90') ? normalized.slice(2) : normalized.replace(/^0/, '');

  console.log(`[SMS] Gönderiliyor → ${phoneNum}`);

  const body = { phone: phoneNum, message };
  const trimmedHeader = (header || '').trim();
  if (trimmedHeader) body.header = trimmedHeader;

  console.log(`[SMS] Body:`, JSON.stringify(body));

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

  console.log(`[SMS] Gönderildi ✓`, result);
  return result;
}

// ─── WhatsApp (noktabilisim.net) ──────────────────────────────────────────────
async function sendWhatsAppHttp(phone, message, s) {
  const url = s.whatsapp_api_url || process.env.WHATSAPP_API_URL || 'http://whatsapp.noktabilisim.net:3000/send-message';

  const normalized  = phone.replace(/[\s\-\(\)]/g, '');
  const phoneNumber = normalized.startsWith('+') ? normalized : `+${normalized}`;

  console.log(`[WA] Gönderiliyor → ${phoneNumber}`);

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
  console.log(`[WA] Gönderildi ✓`, result);
  return result;
}

// ─── SMTP transporter ─────────────────────────────────────────────────────────
async function createTransporter(s) {
  const useSSL  = s.smtp_ssl  === 'true';
  const useAuth = s.smtp_auth === 'true';
  const port    = parseInt(s.smtp_port, 10) || (useSSL ? 465 : 587);

  console.log('[SMTP] Config:', {
    host: s.smtp_host, port, secure: useSSL,
    auth: useAuth ? { user: s.smtp_user, pass: s.smtp_pass ? '***' : '(boş)' } : 'yok',
    from: s.smtp_from_email || s.smtp_user,
  });

  return nodemailer.createTransport({
    host: s.smtp_host, port, secure: useSSL,
    auth: useAuth ? { user: s.smtp_user, pass: s.smtp_pass } : undefined,
    tls: { rejectUnauthorized: false },
  });
}

// ─── E-posta HTML şablonu ─────────────────────────────────────────────────────
function buildHtml(surveyTitle, surveyDescription, link, fromName) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2 style="color:#4f46e5;margin-bottom:8px">${surveyTitle}</h2>
      ${surveyDescription ? `<p style="color:#6b7280;margin-bottom:20px">${surveyDescription}</p>` : ''}
      <a href="${link}"
         style="display:inline-block;background:#4f46e5;color:white;
                padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
        Anketi Doldur →
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">
        Bu e-postayı ${fromName} sistemi üzerinden aldınız.<br>
        Beklemediniz mi? Bu e-postayı görmezden gelebilirsiniz.
      </p>
    </div>`;
}

// ─── Ana gönderim fonksiyonu ──────────────────────────────────────────────────
exports.send = async (method, user, survey, token) => {
  const s    = await getAllSettings();
  const link = await buildLink(token, s);   // ← artık DB'deki site_url kullanılıyor

  console.log(`[NOTIFY] method=${method} link=${link}`);

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
      html:    buildHtml(survey.title, survey.description, link, fromName),
      text:    `${survey.title}\n\nAnketi doldurmak için: ${link}`,
    });
    console.log(`[EMAIL] Gönderildi ✓ messageId: ${info.messageId}`);
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
  const info = await transporter.sendMail({
    from:    `"${fromName}" <${fromEmail}>`,
    to,
    subject: `SurveyPro — Test E-postası`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px">
        <h2 style="color:#4f46e5">✓ SMTP Ayarları Çalışıyor</h2>
        <p style="color:#374151">Bu e-posta SurveyPro SMTP yapılandırmanızın doğru çalıştığını teyit eder.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <p style="color:#6b7280;font-size:13px">
          Sunucu: <strong>${s.smtp_host}:${s.smtp_port}</strong><br>
          SSL: <strong>${s.smtp_ssl === 'true' ? 'Aktif' : 'Pasif'}</strong><br>
          Gönderen: <strong>${fromEmail}</strong><br>
          Site URL: <strong>${s.site_url || 'tanımsız'}</strong>
        </p>
      </div>`,
    text: 'SurveyPro SMTP test e-postası. Yapılandırma başarılı.',
  });
  console.log(`[TEST EMAIL] Gönderildi ✓ messageId: ${info.messageId}`);
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
