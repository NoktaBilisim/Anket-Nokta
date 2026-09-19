const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Survey,
  Question,
  SurveyTarget,
  Response,
  Answer,
  ActivityLog,
  Setting
} = require('../models');
const logger = require('../utils/logger');

const DEFAULT_SETTINGS = [
  { key: 'app_logo', value: process.env.APP_LOGO || '', description: 'Özel kurumsal logo dosya yolu' },
  { key: 'app_title', value: process.env.APP_TITLE || 'SurveyPro', description: 'Uygulama ve sistem başlığı' },
  { key: 'site_url', value: process.env.FRONTEND_URL || 'http://localhost:3000', description: 'Uygulama genel web adresi' },
  { key: 'smtp_host', value: process.env.SMTP_HOST || 'smtp.gmail.com', description: 'SMTP sunucu adresi' },
  { key: 'smtp_port', value: process.env.SMTP_PORT || '587', description: 'SMTP port numarası' },
  { key: 'smtp_user', value: process.env.SMTP_USER || '', description: 'SMTP kullanıcı adı / e-posta' },
  { key: 'smtp_pass', value: process.env.SMTP_PASS || '', description: 'SMTP parolası' },
  { key: 'smtp_ssl', value: 'false', description: 'SMTP SSL / TLS kullanımı' },
  { key: 'smtp_auth', value: 'true', description: 'SMTP kimlik doğrulama' },
  { key: 'smtp_from_name', value: 'SurveyPro Kurumsal', description: 'E-posta gönderici başlığı' },
  { key: 'smtp_from_email', value: 'noreply@surveypro.com', description: 'E-posta gönderici adresi' },
  { key: 'sms_api_url', value: process.env.SMS_API_URL || 'http://smsportal.noktabilisim.net:3001', description: 'Nokta Bilişim SMS Gateway API' },
  { key: 'sms_api_key', value: process.env.SMS_API_KEY || '', description: 'SMS Gateway API Anahtarı' },
  { key: 'sms_header', value: process.env.SMS_HEADER || 'NOKTABLSM', description: 'SMS Başlık (Originator)' },
  { key: 'whatsapp_api_url', value: process.env.WHATSAPP_API_URL || 'http://whatsapp.noktabilisim.net:3000/send-message', description: 'Nokta Bilişim WhatsApp API' }
];

async function seedDefaultSettings() {
  for (const setting of DEFAULT_SETTINGS) {
    await Setting.findOrCreate({
      where: { key: setting.key },
      defaults: setting
    });
  }
}

async function seedDatabase() {
  try {
    const userCount = await User.count();
    if (userCount > 0) {
      await seedDefaultSettings();
      logger.info('Database already contains data, synced default settings and skipping demo seed.');
      return;
    }

    logger.info('Seeding database with initial data...');

    // 1. Kullanıcılar (Cost factor: 12)
    const adminPass = await bcrypt.hash('Admin123!', 12);
    const adminUser = await User.create({
      name: 'Sistem Yöneticisi',
      email: 'admin@surveypro.com',
      password: adminPass,
      role: 'admin',
      phone: '+905550000001',
      whatsapp: '+905550000001',
      is_active: true
    });

    const creatorPass = await bcrypt.hash('Creator123!', 12);
    const creatorUser = await User.create({
      name: 'Anket Yöneticisi (Creator)',
      email: 'creator@surveypro.com',
      password: creatorPass,
      role: 'creator',
      phone: '+905550000002',
      whatsapp: '+905550000002',
      is_active: true
    });

    const evalPass = await bcrypt.hash('Eval123!', 12);
    const evalUser = await User.create({
      name: 'Değerlendirici (Evaluator)',
      email: 'evaluator@surveypro.com',
      password: evalPass,
      role: 'evaluator',
      phone: '+905550000003',
      whatsapp: '+905550000003',
      is_active: true
    });

    const participantPass = await bcrypt.hash('User123!', 12);
    const user1 = await User.create({
      name: 'Ahmet Yılmaz',
      email: 'user1@surveypro.com',
      password: participantPass,
      role: 'participant',
      phone: '+905551234567',
      whatsapp: '+905551234567',
      is_active: true
    });

    const user2 = await User.create({
      name: 'Ayşe Demir',
      email: 'user2@surveypro.com',
      password: participantPass,
      role: 'participant',
      phone: '+905557654321',
      whatsapp: '+905557654321',
      is_active: true
    });

    const user3 = await User.create({
      name: 'Mehmet Kaya',
      email: 'user3@surveypro.com',
      password: participantPass,
      role: 'participant',
      phone: '+905559876543',
      whatsapp: '+905559876543',
      is_active: true
    });

    // 2. Sistem Ayarları (Logo, Başlık, SMTP, SMS, WhatsApp)
    await seedDefaultSettings();

    // 3. Örnek Aktif Anket (5 Soru Tipi + Puanlama + Kategoriler)
    const survey = await Survey.create({
      title: '2026 Q1 Çalışan Memnuniyeti ve Liderlik Değerlendirmesi',
      description: 'Kurum içi memnuniyet, liderlik etkinliği ve çalışma ortamı standartlarını ölçümleyen kapsamlı anket.',
      status: 'active',
      anonymous: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün geçerli
      settings: { allowAnonymous: false, showProgressBar: true },
      created_by: creatorUser.id
    });

    const questions = await Question.bulkCreate([
      {
        survey_id: survey.id,
        type: 'multiple_choice',
        text: 'Şirketimizde çalışmaktan genel olarak ne kadar memnunsunuz?',
        category: 'Genel Memnuniyet',
        required: true,
        order: 0,
        options: [
          { text: 'Kesinlikle Memnunum', score: 5 },
          { text: 'Memnunum', score: 4 },
          { text: 'Kararsızım / Nötr', score: 3 },
          { text: 'Memnun Değilim', score: 2 },
          { text: 'Hiç Memnun Değilim', score: 1 }
        ]
      },
      {
        survey_id: survey.id,
        type: 'rating',
        text: 'Doğrudan yöneticinizin liderlik, geribildirim ve iletişim becerilerini puanlayınız (1-10)',
        category: 'Yönetim ve Liderlik',
        required: true,
        order: 1,
        options: []
      },
      {
        survey_id: survey.id,
        type: 'yes_no',
        text: 'Gelecek 2 yıl boyunca kariyerinize şirketimizde devam etmeyi planlıyor musunuz?',
        category: 'Kurum Bağlılığı',
        required: true,
        order: 2,
        options: [
          { text: 'Evet', score: 5 },
          { text: 'Hayır', score: 0 }
        ]
      },
      {
        survey_id: survey.id,
        type: 'matrix',
        text: 'Aşağıdaki çalışma ortamı unsurlarını deneyiminize göre değerlendiriniz',
        category: 'Çalışma Koşulları',
        required: true,
        order: 3,
        options: {
          rows: [
            { text: 'Fiziksel ve Ergonomik Çalışma Ortamı' },
            { text: 'Takım İçi İletişim ve İşbirliği' },
            { text: 'Eğitim ve Mesleki Gelişim Fırsatları' }
          ],
          columns: [
            { text: 'Çok İyi', score: 5 },
            { text: 'İyi', score: 4 },
            { text: 'Orta', score: 3 },
            { text: 'Geliştirilmeli', score: 2 },
            { text: 'Yetersiz', score: 1 }
          ]
        }
      },
      {
        survey_id: survey.id,
        type: 'text',
        text: 'Şirket kültürümüzü, iş süreçlerimizi ve çalışma ortamımızı geliştirmek için önerileriniz nelerdir?',
        category: 'Görüş ve Öneriler',
        required: false,
        order: 4,
        options: []
      }
    ], { returning: true });

    // 4. Taslak Anket (Editor testi için)
    const draftSurvey = await Survey.create({
      title: '2026 IT Altyapı ve Donanım İhtiyaç Anketi',
      description: 'Geliştirici ve ofis personeli donanım ve yazılım talepleri taslağı.',
      status: 'draft',
      anonymous: true,
      created_by: adminUser.id
    });

    await Question.create({
      survey_id: draftSurvey.id,
      type: 'multiple_choice',
      text: 'Mevcut bilgisayar donanımınız işinizi yapmak için yeterli mi?',
      category: 'Donanım',
      required: true,
      order: 0,
      options: [
        { text: 'Tamamen Yeterli', score: 5 },
        { text: 'Kısmen Yeterli', score: 3 },
        { text: 'Yetersiz (Yenilenmeli)', score: 1 }
      ]
    });

    // 5. Anket Hedefleri ve Örnek Yanıtlar
    const now = new Date();
    const sentTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const openedTime1 = new Date(now.getTime() - 90 * 60 * 1000);
    const completedTime1 = new Date(now.getTime() - 85 * 60 * 1000);

    const openedTime2 = new Date(now.getTime() - 45 * 60 * 1000);
    const completedTime2 = new Date(now.getTime() - 40 * 60 * 1000);

    // Hedef 1: Ahmet Yılmaz (Tamamlandı)
    const target1 = await SurveyTarget.create({
      survey_id: survey.id,
      user_id: user1.id,
      send_method: 'email',
      sent_at: sentTime,
      opened_at: openedTime1,
      completed_at: completedTime1
    });

    const response1 = await Response.create({
      survey_id: survey.id,
      user_id: user1.id,
      target_id: target1.id,
      is_complete: true,
      duration_seconds: 125,
      created_at: completedTime1,
      updated_at: completedTime1
    });

    await Answer.bulkCreate([
      { response_id: response1.id, question_id: questions[0].id, value: ['Kesinlikle Memnunum'] },
      { response_id: response1.id, question_id: questions[1].id, value: 9 },
      { response_id: response1.id, question_id: questions[2].id, value: ['Evet'] },
      { response_id: response1.id, question_id: questions[3].id, value: { '0': 'Çok İyi', '1': 'İyi', '2': 'Çok İyi' } },
      { response_id: response1.id, question_id: questions[4].id, value: 'Hibrit çalışma günleri artırılabilir ve yeni eğitim platformu lisansları eklenebilir.' }
    ]);

    // Hedef 2: Ayşe Demir (Tamamlandı)
    const target2 = await SurveyTarget.create({
      survey_id: survey.id,
      user_id: user2.id,
      send_method: 'sms',
      sent_at: sentTime,
      opened_at: openedTime2,
      completed_at: completedTime2
    });

    const response2 = await Response.create({
      survey_id: survey.id,
      user_id: user2.id,
      target_id: target2.id,
      is_complete: true,
      duration_seconds: 165,
      created_at: completedTime2,
      updated_at: completedTime2
    });

    await Answer.bulkCreate([
      { response_id: response2.id, question_id: questions[0].id, value: ['Memnunum'] },
      { response_id: response2.id, question_id: questions[1].id, value: 8 },
      { response_id: response2.id, question_id: questions[2].id, value: ['Evet'] },
      { response_id: response2.id, question_id: questions[3].id, value: { '0': 'İyi', '1': 'Çok İyi', '2': 'İyi' } },
      { response_id: response2.id, question_id: questions[4].id, value: 'Yemekhane menüsü çeşitlendirilebilir.' }
    ]);

    // Hedef 3: Mehmet Kaya (Açıldı ama henüz tamamlanmadı)
    await SurveyTarget.create({
      survey_id: survey.id,
      user_id: user3.id,
      send_method: 'whatsapp',
      sent_at: sentTime,
      opened_at: new Date(now.getTime() - 10 * 60 * 1000),
      completed_at: null
    });

    // 6. Aktivite Logları
    await ActivityLog.bulkCreate([
      {
        user_id: adminUser.id,
        action: 'user_login',
        ip_address: '127.0.0.1',
        metadata: { info: 'Sistem başlangıç tohumu oluşturuldu' }
      },
      {
        user_id: creatorUser.id,
        survey_id: survey.id,
        action: 'survey_created',
        ip_address: '127.0.0.1',
        metadata: { title: survey.title }
      },
      {
        user_id: creatorUser.id,
        survey_id: survey.id,
        action: 'survey_sent',
        ip_address: '127.0.0.1',
        metadata: { method: 'multi-channel', sent: 3, failed: 0 }
      },
      {
        user_id: user1.id,
        survey_id: survey.id,
        action: 'response_submitted',
        ip_address: '127.0.0.1',
        metadata: { duration: 125 }
      },
      {
        user_id: user2.id,
        survey_id: survey.id,
        action: 'response_submitted',
        ip_address: '127.0.0.1',
        metadata: { duration: 165 }
      }
    ]);

    logger.info('Database seeded successfully with initial users, surveys, questions, targets, responses and settings.');
  } catch (err) {
    logger.error(`Seed error: ${err.message}`);
    throw err;
  }
}

// Doğrudan CLI üzerinden çağrıldığında (npm run seed / node src/database/seed.js)
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      logger.info('Database connected for seeding.');
      await sequelize.sync({ alter: true });
      await seedDatabase();
      process.exit(0);
    } catch (err) {
      logger.error('CLI Seed failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedDatabase, seedDefaultSettings, DEFAULT_SETTINGS };
