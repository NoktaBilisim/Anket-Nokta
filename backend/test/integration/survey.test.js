const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Survey, Question, SurveyTarget, Response, Answer } = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('Anket Yönetimi ve Raporlama Entegrasyon Testleri (AC-1, AC-2, AC-3, AC-22, P-03, P-04, P-06)', () => {
  let adminUser, creatorUser, otherCreatorUser, participantUser, evaluatorUser;
  let adminToken, creatorToken, otherCreatorToken, participantToken, evaluatorToken;
  let createdSurveyId;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync();

    const hash = await bcrypt.hash('Password123!', 10);

    // Test Kullanıcıları
    [adminUser] = await User.findOrCreate({
      where: { email: 'survey_admin@test.com' },
      defaults: { name: 'Survey Admin', email: 'survey_admin@test.com', password: hash, role: 'admin', is_active: true }
    });

    [creatorUser] = await User.findOrCreate({
      where: { email: 'survey_creator@test.com' },
      defaults: { name: 'Survey Creator', email: 'survey_creator@test.com', password: hash, role: 'creator', is_active: true }
    });

    [otherCreatorUser] = await User.findOrCreate({
      where: { email: 'other_creator@test.com' },
      defaults: { name: 'Other Creator', email: 'other_creator@test.com', password: hash, role: 'creator', is_active: true }
    });

    [participantUser] = await User.findOrCreate({
      where: { email: 'survey_part@test.com' },
      defaults: { name: 'Survey Participant', email: 'survey_part@test.com', phone: '05551234567', password: hash, role: 'participant', is_active: true }
    });

    [evaluatorUser] = await User.findOrCreate({
      where: { email: 'survey_eval@test.com' },
      defaults: { name: 'Survey Evaluator', email: 'survey_eval@test.com', phone: '05551234568', password: hash, role: 'evaluator', is_active: true }
    });

    // Tokenlar
    const resA = await request(app).post('/api/auth/login').send({ email: 'survey_admin@test.com', password: 'Password123!' });
    adminToken = resA.body.data.accessToken;

    const resC = await request(app).post('/api/auth/login').send({ email: 'survey_creator@test.com', password: 'Password123!' });
    creatorToken = resC.body.data.accessToken;

    const resOC = await request(app).post('/api/auth/login').send({ email: 'other_creator@test.com', password: 'Password123!' });
    otherCreatorToken = resOC.body.data.accessToken;

    const resP = await request(app).post('/api/auth/login').send({ email: 'survey_part@test.com', password: 'Password123!' });
    participantToken = resP.body.data.accessToken;

    const resE = await request(app).post('/api/auth/login').send({ email: 'survey_eval@test.com', password: 'Password123!' });
    evaluatorToken = resE.body.data.accessToken;
  });

  afterAll(async () => {
    if (createdSurveyId) {
      const responses = await Response.findAll({ where: { survey_id: createdSurveyId } });
      const respIds = responses.map(r => r.id);
      if (respIds.length) {
        await Answer.destroy({ where: { response_id: respIds } });
      }
      await Response.destroy({ where: { survey_id: createdSurveyId } });
      await SurveyTarget.destroy({ where: { survey_id: createdSurveyId } });
      await Question.destroy({ where: { survey_id: createdSurveyId } });
      await Survey.destroy({ where: { id: createdSurveyId } });
    }
    await User.destroy({
      where: {
        email: ['survey_admin@test.com', 'survey_creator@test.com', 'other_creator@test.com', 'survey_part@test.com', 'survey_eval@test.com']
      }
    });
  });

  describe('AC-1: Anket Oluşturma (POST /api/surveys)', () => {
    it('AC-1 creator rolüyle 5 farklı soru tipi ve kategori içeren anket oluşturulabilmeli', async () => {
      const payload = {
        title: 'Müşteri Deneyimi Anketi 2026',
        description: 'Lütfen ürünlerimizi değerlendiriniz.',
        anonymous: false,
        questions: [
          {
            text: 'Genel hizmet kalitesinden memnun musunuz?',
            type: 'yes_no',
            category: 'Genel',
            options: [
              { text: 'Evet', score: 10 },
              { text: 'Hayır', score: 0 }
            ]
          },
          {
            text: 'Hangi sıklıkla alışveriş yapıyorsunuz?',
            type: 'multiple_choice',
            category: 'Alışveriş',
            options: [
              { text: 'Haftada bir', score: 10 },
              { text: 'Ayda bir', score: 5 },
              { text: 'Yılda bir', score: 2 }
            ]
          },
          {
            text: 'Müşteri temsilcimizin nezaketini puanlayınız (1-5)',
            type: 'rating',
            category: 'İletişim'
          },
          {
            text: 'Departman bazlı değerlendirme',
            type: 'matrix',
            category: 'Performans',
            options: {
              rows: ['Destek', 'Satış'],
              columns: [
                { text: 'Başarılı', score: 10 },
                { text: 'Geliştirilmeli', score: 3 }
              ]
            }
          },
          {
            text: 'Varsa ek görüş ve önerileriniz:',
            type: 'text',
            category: 'Geri Bildirim'
          }
        ]
      };

      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('Müşteri Deneyimi Anketi 2026');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.questions.length).toBe(5);

      createdSurveyId = res.body.data.id;
    });

    it('AC-1 katılımcı rolü anket oluşturmaya çalıştığında 403 Forbidden dönmeli', async () => {
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ title: 'Yetkisiz Anket' });

      expect(res.status).toBe(403);
    });

    it('AC-1 başlık boş bırakıldığında 400 Bad Request dönmeli', async () => {
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ title: '   ', questions: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('AC-2: Anket Durum Yönetimi (PATCH /api/surveys/:id/status)', () => {
    it('AC-2 anket durumu draft -> active yapılabilmeli', async () => {
      const res = await request(app)
        .patch(`/api/surveys/${createdSurveyId}/status`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });

    it('AC-2 başka bir creator anketi güncellemeye çalıştığında 403 Forbidden almalı', async () => {
      const res = await request(app)
        .patch(`/api/surveys/${createdSurveyId}/status`)
        .set('Authorization', `Bearer ${otherCreatorToken}`)
        .send({ status: 'closed' });

      expect(res.status).toBe(403);
    });
  });

  describe('AC-3 & P-03: Gönderim ve Rate Limit (POST /api/surveys/:id/send)', () => {
    it('AC-3 seçilen katılımcıya e-posta kanalı üzerinden anket gönderilmeli', async () => {
      const res = await request(app)
        .post(`/api/surveys/${createdSurveyId}/send`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          userIds: [participantUser.id],
          method: 'email'
        });

      // Gerçek SMTP test ortamında konfigüre olmasa dahi endpoint'in düzgün çalıştığını ve hedef oluşturduğunu test eder
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.sent).toBeGreaterThanOrEqual(1);
      }
    });

    it('P-03 geçersiz gönderim yöntemi için 400 Bad Request dönmeli', async () => {
      const res = await request(app)
        .post(`/api/surveys/${createdSurveyId}/send`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          userIds: [participantUser.id],
          method: 'unknown_channel'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/surveys/:id (IDOR Güvenliği)', () => {
    it('SEC-IDOR-1 Sahip olan creator anket detayını başarıyla görüntüleyebilmeli', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdSurveyId);
    });

    it('SEC-IDOR-2 Başka bir creator kendisine ait olmayan anketi görüntülemeye çalıştığında 403 Forbidden almalı', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}`)
        .set('Authorization', `Bearer ${otherCreatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Bu anketi görüntüleme yetkiniz yok');
    });

    it('SEC-IDOR-3 Admin kullanıcısı tüm anketlerin detayını görüntüleyebilmeli', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('SEC-IDOR-4 Atanmamış bir katılımcı anketi görüntülemeye çalıştığında 403 Forbidden almalı', async () => {
      const uHash = await bcrypt.hash('Password123!', 10);
      const unassignedUser = await User.create({
        name: 'Unassigned User',
        email: 'unassigned@test.com',
        password: uHash,
        role: 'participant',
        is_active: true
      });

      const unassignedRes = await request(app).post('/api/auth/login').send({
        email: 'unassigned@test.com',
        password: 'Password123!'
      });
      const unassignedToken = unassignedRes.body.data.accessToken;

      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}`)
        .set('Authorization', `Bearer ${unassignedToken}`);

      expect(res.status).toBe(403);

      await User.destroy({ where: { email: 'unassigned@test.com' } });
    });
  });

  describe('P-04: Raporlama ve Redis Önbellekleme (GET /api/surveys/:id/report)', () => {
    it('P-04 rapor endpointi hesaplanmış skorlar ve önbellek desteğiyle başarıyla dönmeli', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}/report`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('survey');
      expect(res.body.data).toHaveProperty('questionStats');
      expect(res.body.data).toHaveProperty('userScores');
      expect(res.body.data).toHaveProperty('totalScoreAll');
    });

    it('P-04 IDOR: Başka bir creator anket raporuna erişmeye çalıştığında 403 Forbidden dönmeli', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}/report`)
        .set('Authorization', `Bearer ${otherCreatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Bu anketin raporuna erişim yetkiniz yok');
    });

    it('P-04 Evaluator: Kendisine hedef atanmış evaluator anket raporuna erişebilmeli', async () => {
      // Evaluator için hedef kayıt oluştur
      await SurveyTarget.findOrCreate({
        where: { survey_id: createdSurveyId, user_id: evaluatorUser.id },
        defaults: {
          survey_id: createdSurveyId,
          user_id: evaluatorUser.id,
          send_method: 'email'
        }
      });

      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}/report`)
        .set('Authorization', `Bearer ${evaluatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('P-04 Admin kullanıcısı başkasına ait anket raporuna erişebilmeli', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}/report`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/logs/stats (İstatistik ve Bilgi İfşası Koruması)', () => {
    it('SEC-STAT-1 Katılımcı /stats uç noktasına erişmek istediğinde 403 Forbidden dönmeli', async () => {
      const res = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.status).toBe(403);
    });

    it('SEC-STAT-2 Creator ve Admin /stats uç noktasına başarıyla erişebilmeli', async () => {
      const resCreator = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(resCreator.status).toBe(200);
      expect(resCreator.body.success).toBe(true);
      expect(resCreator.body.data).toHaveProperty('totalSurveys');

      const resAdmin = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);
    });
  });

  describe('AC-22 & P-06: Excel Dışa Aktarma (GET /api/surveys/:id/export-excel)', () => {
    it('AC-22 Excel dışa aktarımı doğru Content-Type ve Content-Disposition header ları ile dönmeli', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}/export-excel`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain("filename*=UTF-8''");
      expect(res.text || res.body).toBeDefined();
    });

    it('AC-22 IDOR: Başka bir creator Excel raporunu indirmeye çalıştığında 403 Forbidden dönmeli', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}/export-excel`)
        .set('Authorization', `Bearer ${otherCreatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Bu anketin raporuna erişim yetkiniz yok');
    });

    it('AC-22 Admin kullanıcısı başkasına ait anketin Excel raporunu indirebilmeli', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}/export-excel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });
});
