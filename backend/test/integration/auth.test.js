const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User } = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('Kimlik Doğrulama ve Yetkilendirme Entegrasyon Testleri', () => {
  let testAdminToken;
  let testCreatorToken;
  let testParticipantToken;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync();

    // Test kullanıcılarını hazırla
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const creatorHash = await bcrypt.hash('Creator123!', 10);
    const participantHash = await bcrypt.hash('User123!', 10);

    const [admin] = await User.findOrCreate({
      where: { email: 'testadmin@truguard.com' },
      defaults: {
        name: 'Test Admin',
        email: 'testadmin@truguard.com',
        password: adminHash,
        role: 'admin',
        is_active: true
      }
    });

    const [creator] = await User.findOrCreate({
      where: { email: 'testcreator@truguard.com' },
      defaults: {
        name: 'Test Creator',
        email: 'testcreator@truguard.com',
        password: creatorHash,
        role: 'creator',
        is_active: true
      }
    });

    const [participant] = await User.findOrCreate({
      where: { email: 'testparticipant@truguard.com' },
      defaults: {
        name: 'Test Participant',
        email: 'testparticipant@truguard.com',
        password: participantHash,
        role: 'participant',
        is_active: true
      }
    });

    // Tokenları al
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'testadmin@truguard.com',
      password: 'Admin123!'
    });
    testAdminToken = adminRes.body.data.accessToken;

    const creatorRes = await request(app).post('/api/auth/login').send({
      email: 'testcreator@truguard.com',
      password: 'Creator123!'
    });
    testCreatorToken = creatorRes.body.data.accessToken;

    const partRes = await request(app).post('/api/auth/login').send({
      email: 'testparticipant@truguard.com',
      password: 'User123!'
    });
    testParticipantToken = partRes.body.data.accessToken;
  });

  afterAll(async () => {
    await User.destroy({
      where: {
        email: ['testadmin@truguard.com', 'testcreator@truguard.com', 'testparticipant@truguard.com']
      }
    });
  });

  describe('POST /api/auth/login', () => {
    it('AC-AUTH-1 doğru e-posta ve şifre ile JWT access ve refresh token dönmeli', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'testadmin@truguard.com', password: 'Admin123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('testadmin@truguard.com');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('AC-AUTH-2 yanlış şifre ile 401 Unauthorized dönmeli', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'testadmin@truguard.com', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('AC-AUTH-3 geçersiz e-posta formatı için 400 Bad Request dönmeli', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'Admin123!' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('AC-AUTH-4 yetkili token ile giriş yapmış kullanıcının profilini dönmeli', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('testadmin@truguard.com');
      expect(res.body.data.role).toBe('admin');
    });

    it('AC-AUTH-5 token verilmediğinde 401 Unauthorized dönmeli', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/register (Açık Kayıt Güvenliği)', () => {
    it('SEC-REG-1 Kayıt olurken role: "admin" gönderilse bile daima "participant" rolü atanmalı', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Privilege Escalation Tester',
          email: 'escalation_test@truguard.com',
          password: 'Password123!',
          role: 'admin'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('participant');
      expect(res.body.data.user.email).toBe('escalation_test@truguard.com');

      // Veritabanını temizle
      await User.destroy({ where: { email: 'escalation_test@truguard.com' } });
    });
  });
});
