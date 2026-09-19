const request = require('supertest');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { sequelize, User, Setting, ActivityLog } = require('../../src/models');

describe('Sistem Ayarları ve Kurumsal Logo API Entegrasyon Testleri (AC-23, AC-24, AC-27)', () => {
  let adminToken;
  let participantToken;
  const testUploadsDir = path.join(__dirname, '../../uploads/logos');

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync();

    // Dizin kontrolü
    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir, { recursive: true });
    }

    // Test kullanıcıları
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const participantHash = await bcrypt.hash('User123!', 10);

    const [admin] = await User.findOrCreate({
      where: { email: 'settings_admin@test.com' },
      defaults: {
        name: 'Settings Admin',
        email: 'settings_admin@test.com',
        password: adminHash,
        role: 'admin',
        is_active: true
      }
    });

    const [participant] = await User.findOrCreate({
      where: { email: 'settings_user@test.com' },
      defaults: {
        name: 'Settings User',
        email: 'settings_user@test.com',
        password: participantHash,
        role: 'participant',
        is_active: true
      }
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'settings_admin@test.com',
      password: 'Admin123!'
    });
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app).post('/api/auth/login').send({
      email: 'settings_user@test.com',
      password: 'User123!'
    });
    participantToken = userLogin.body.data.accessToken;

    // Ayar başlangıç kayıtları
    await Setting.upsert({ key: 'app_title', value: 'SurveyPro Kurumsal' });
    await Setting.upsert({ key: 'smtp_pass', value: 'gizli_smtp_parolasi' });
    await Setting.upsert({ key: 'sms_api_key', value: 'gizli_sms_anahtari' });
    await Setting.upsert({ key: 'site_url', value: 'http://localhost:3000' });
    await Setting.upsert({ key: 'app_logo', value: '' });
  });

  afterAll(async () => {
    await User.destroy({
      where: { email: ['settings_admin@test.com', 'settings_user@test.com'] }
    });
    await ActivityLog.destroy({
      where: { action: 'setting_updated' }
    });
  });

  describe('GET /api/settings/public (AC-27)', () => {
    it('AC-27: auth gerektirmeden yalnızca genel ayarları dönmeli ve hassas verileri sızdırmamalı', async () => {
      const startTime = Date.now();
      const res = await request(app).get('/api/settings/public');
      const duration = Date.now() - startTime;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('app_logo');
      expect(res.body.data).toHaveProperty('app_title', 'SurveyPro Kurumsal');
      expect(res.body.data).toHaveProperty('site_url', 'http://localhost:3000');

      // Hassas alanların sızdırılmadığının doğrulanması
      expect(res.body.data).not.toHaveProperty('smtp_pass');
      expect(res.body.data).not.toHaveProperty('sms_api_key');
      expect(res.body.data).not.toHaveProperty('smtp_user');
      expect(res.body.data).not.toHaveProperty('sms_api_url');

      // SLA hedefi: < 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('POST /api/settings/logo (AC-23, AC-24)', () => {
    let uploadedLogoUrl = null;

    it('AC-23: Admin yetkisiyle geçerli PNG logo yüklenmeli ve settings tablosu güncellenmeli', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
      ]);

      const res = await request(app)
        .post('/api/settings/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', pngBuffer, 'test_logo.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('app_logo');
      expect(res.body.data.app_logo).toMatch(/^\/uploads\/logos\/logo_.*\.png$/);

      uploadedLogoUrl = res.body.data.app_logo;

      // DB doğrulaması
      const setting = await Setting.findOne({ where: { key: 'app_logo' } });
      expect(setting.value).toBe(uploadedLogoUrl);

      // Audit log doğrulaması
      const log = await ActivityLog.findOne({
        where: { action: 'setting_updated' },
        order: [['created_at', 'DESC']]
      });
      expect(log).not.toBeNull();
      expect(log.metadata).toHaveProperty('field', 'app_logo');
    });

    it('AC-23: SVG yüklemesinde XSS scriptleri ve zararlı etiketler sunucuda temizlenmelidir', async () => {
      const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'XSS\')"><script>alert(1)</script><circle cx="50" cy="50" r="40" fill="red" /></svg>';

      const res = await request(app)
        .post('/api/settings/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', Buffer.from(maliciousSvg), 'malicious.svg');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.app_logo).toMatch(/^\/uploads\/logos\/logo_.*\.svg$/);

      // Diskteki dosya içeriğini kontrol et
      const savedFileName = path.basename(res.body.data.app_logo);
      const savedFilePath = path.join(testUploadsDir, savedFileName);
      const savedContent = fs.readFileSync(savedFilePath, 'utf8');

      expect(savedContent).not.toContain('<script');
      expect(savedContent).not.toContain('onload');
      expect(savedContent).toContain('<circle');
    });

    it('AC-23: 2MB üstü dosya gönderildiğinde 400 Bad Request dönmelidir', async () => {
      // 2.5 MB'lık sahte dosya
      const oversizedBuffer = Buffer.alloc(2.5 * 1024 * 1024);

      const res = await request(app)
        .post('/api/settings/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', oversizedBuffer, 'oversized.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('2MB');
    });

    it('AC-23: Geçersiz dosya formatı (.txt, .exe, .php vb.) yüklendiğinde 400 Bad Request dönmelidir', async () => {
      const textBuffer = Buffer.from('Bu bir metin dosyasıdır');

      const res = await request(app)
        .post('/api/settings/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', textBuffer, 'virus.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Geçersiz dosya formatı');
    });

    it('AC-23: Dosya seçilmeden istek atıldığında 400 Bad Request dönmelidir', async () => {
      const res = await request(app)
        .post('/api/settings/logo')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Lütfen bir logo dosyası seçin');
    });

    it('AC-23: Token gönderilmediğinde 401, admin olmayan rolde 403 dönmelidir', async () => {
      const pngBuffer = Buffer.from('fake png content');

      // Token yok
      const resNoToken = await request(app)
        .post('/api/settings/logo')
        .attach('logo', pngBuffer, 'test.png');
      expect(resNoToken.status).toBe(401);

      // Participant rolü
      const resParticipant = await request(app)
        .post('/api/settings/logo')
        .set('Authorization', `Bearer ${participantToken}`)
        .attach('logo', pngBuffer, 'test.png');
      expect(resParticipant.status).toBe(403);
    });
  });

  describe('DELETE /api/settings/logo (AC-24)', () => {
    it('AC-24: Admin yetkisiyle özel logo silinmeli, disk temizlenmeli ve varsayılana dönülmelidir', async () => {
      // Önce bir logo yükleyelim
      const pngBuffer = Buffer.from('sample png image');
      const uploadRes = await request(app)
        .post('/api/settings/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', pngBuffer, 'logo_to_delete.png');

      const logoUrl = uploadRes.body.data.app_logo;
      const logoFilename = path.basename(logoUrl);
      const filePath = path.join(testUploadsDir, logoFilename);

      expect(fs.existsSync(filePath)).toBe(true);

      // Silme isteği
      const deleteRes = await request(app)
        .delete('/api/settings/logo')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.data.app_logo).toBeNull();

      // DB kontrolü
      const setting = await Setting.findOne({ where: { key: 'app_logo' } });
      expect(setting.value).toBe('');

      // Disk kontrolü (dosya silinmiş olmalı)
      expect(fs.existsSync(filePath)).toBe(false);

      // Public API kontrolü
      const publicRes = await request(app).get('/api/settings/public');
      expect(publicRes.body.data.app_logo).toBeNull();
    });

    it('AC-24: Token yokken 401, yetkisiz kullanıcıda 403 dönmelidir', async () => {
      const resNoToken = await request(app).delete('/api/settings/logo');
      expect(resNoToken.status).toBe(401);

      const resParticipant = await request(app)
        .delete('/api/settings/logo')
        .set('Authorization', `Bearer ${participantToken}`);
      expect(resParticipant.status).toBe(403);
    });
  });

  describe('Statik Dosya Sunumu (/uploads ve /api/uploads)', () => {
    it('Yüklenen logo dosyası /uploads ve /api/uploads üzerinden nosniff başlığı ile servis edilmelidir', async () => {
      // Bir test dosyası oluşturalım
      const testFileName = 'logo_static_test.png';
      const testFilePath = path.join(testUploadsDir, testFileName);
      fs.writeFileSync(testFilePath, 'dummy image content');

      const res1 = await request(app).get(`/uploads/logos/${testFileName}`);
      expect(res1.status).toBe(200);
      expect(res1.headers['x-content-type-options']).toBe('nosniff');

      const res2 = await request(app).get(`/api/uploads/logos/${testFileName}`);
      expect(res2.status).toBe(200);
      expect(res2.headers['x-content-type-options']).toBe('nosniff');

      // Temizlik
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    });
  });
});
