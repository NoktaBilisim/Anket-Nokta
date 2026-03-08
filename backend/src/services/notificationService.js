const nodemailer = require('nodemailer');
const { getAllSettings } = require('./settingsService');

async function createTransporter() {
  const s = await getAllSettings();

  const useSSL  = s.smtp_ssl  === 'true';
  const useAuth = s.smtp_auth === 'true';
  const port    = parseInt(s.smtp_port, 10) || (useSSL ? 465 : 587);

  console.log('[SMTP] Config:', {
    host: s.smtp_host,
    port,
    secure: useSSL,
    auth: useAuth ? { user: s.smtp_user, pass: s.smtp_pass ? '***' : '(boş)' } : 'yok',
    from: s.smtp_from_email || s.smtp_user
  });

  return nodemailer.createTransport({
    host: s.smtp_host,
    port,
    secure: useSSL,
    auth: useAuth ? { user: s.smtp_user, pass: s.smtp_pass } : undefined,
    tls: { rejectUnauthorized: false }
  });
}

function buildHtml(surveyTitle, surveyDescription, link, fromName) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2 style="color:#4f46e5;margin-bottom:8px">${surveyTitle}</h2>
      ${surveyDescription ? `<p style="color:#6b7280;margin-bottom:20px">${surveyDescription}</p>` : ''}
      <a href="${link}"
         style="display:inline-block;background:#4f46e5;color:white;
                padding:12px 28px;border-radius:8px;text-decoration:none;
                font-weight:600">
        Anketi Doldur →
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">
        Bu e-postayı ${fromName} sistemi üzerinden aldınız.<br>
        Beklemediniz mi? Bu e-postayı görmezden gelebilirsiniz.
      </p>
    </div>`;
}

exports.send = async (method, user, survey, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${frontendUrl}/survey/${token}`;
  const s    = await getAllSettings();

  if (method === 'email') {
    if (!user.email) throw new Error(`Kullanıcının e-posta adresi yok: ${user.name}`);

    const transporter    = await createTransporter();
    const fromEmail      = s.smtp_from_email || s.smtp_user;
    const fromName       = s.smtp_from_name  || 'SurveyPro';

    console.log(`[EMAIL] Gönderiliyor: ${user.email}`);

    const info = await transporter.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to:      user.email,
      subject: `Anket: ${survey.title}`,
      html:    buildHtml(survey.title, survey.description, link, fromName),
      text:    `${survey.title}\n\nAnketi doldurmak için: ${link}`
    });

    console.log(`[EMAIL] Gönderildi ✓ messageId: ${info.messageId}`);
    return info;

  } else if (method === 'sms') {
    if (!user.phone) throw new Error(`Kullanıcının telefon numarası yok: ${user.name}`);
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   user.phone,
      body: `${survey.title} anketini doldurmak için: ${link}`
    });

  } else if (method === 'whatsapp') {
    if (!user.phone && !user.whatsapp) throw new Error(`Kullanıcının WhatsApp/telefon numarası yok: ${user.name}`);
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to:   `whatsapp:${user.whatsapp || user.phone}`,
      body: `*${survey.title}*\n\nAnketi doldurmak için:\n${link}`
    });
  }
};

// Sadece bağlantı kontrolü
exports.testSmtp = async () => {
  const transporter = await createTransporter();
  await transporter.verify();
  return true;
};

// Gerçek test e-postası gönderir
exports.sendTestEmail = async (to) => {
  const s           = await getAllSettings();
  const transporter = await createTransporter();
  const fromEmail   = s.smtp_from_email || s.smtp_user;
  const fromName    = s.smtp_from_name  || 'SurveyPro';

  console.log(`[TEST EMAIL] Gönderiliyor → ${to}`);

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
          Gönderen: <strong>${fromEmail}</strong>
        </p>
      </div>`,
    text: 'SurveyPro SMTP test e-postası. Yapılandırma başarılı.'
  });

  console.log(`[TEST EMAIL] Gönderildi ✓ messageId: ${info.messageId}`);
  return info;
};
