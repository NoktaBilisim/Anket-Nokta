const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Survey, Question, SurveyTarget, Response, Answer } = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('Katılımcı Anket Yanıtlama Entegrasyon Testleri (Response Flow)', () => {
  let adminUser, participantUser;
  let testSurvey, testTarget;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync();

    const hash = await bcrypt.hash('Password123!', 10);

    [adminUser] = await User.findOrCreate({
      where: { email: 'resp_admin@test.com' },
      defaults: { name: 'Resp Admin', email: 'resp_admin@test.com', password: hash, role: 'admin', is_active: true }
    });

    [participantUser] = await User.findOrCreate({
      where: { email: 'resp_part@test.com' },
      defaults: { name: 'Resp Participant', email: 'resp_part@test.com', password: hash, role: 'participant', is_active: true }
    });

    // Test Anketi Oluştur
    testSurvey = await Survey.create({
      title: 'Hızlı Memnuniyet Testi',
      description: 'Test amaçlı anket',
      anonymous: true,
      status: 'active',
      created_by: adminUser.id
    });

    const q1 = await Question.create({
      survey_id: testSurvey.id,
      text: 'Genel Puanınız',
      type: 'rating',
      order: 0
    });

    const q2 = await Question.create({
      survey_id: testSurvey.id,
      text: 'Öneri veya düşünceniz',
      type: 'text',
      order: 1
    });

    // Test Target Oluştur
    testTarget = await SurveyTarget.create({
      survey_id: testSurvey.id,
      user_id: participantUser.id,
      send_method: 'email'
    });
  });

  afterAll(async () => {
    if (testSurvey) {
      const responses = await Response.findAll({ where: { survey_id: testSurvey.id } });
      const respIds = responses.map(r => r.id);
      if (respIds.length) {
        await Answer.destroy({ where: { response_id: respIds } });
      }
      await Response.destroy({ where: { survey_id: testSurvey.id } });
      await SurveyTarget.destroy({ where: { survey_id: testSurvey.id } });
      await Question.destroy({ where: { survey_id: testSurvey.id } });
      await testSurvey.destroy();
    }
    await User.destroy({
      where: { email: ['resp_admin@test.com', 'resp_part@test.com'] }
    });
  });

  describe('GET /api/responses/:token', () => {
    it('AC-RESP-1 geçerli token ile anket ve sorular başarıyla getirilmeli', async () => {
      const res = await request(app).get(`/api/responses/${testTarget.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.survey.title).toBe('Hızlı Memnuniyet Testi');
      expect(res.body.data.survey.questions.length).toBe(2);
    });

    it('AC-RESP-2 geçersiz token verildiğinde 404 dönmeli', async () => {
      const res = await request(app).get('/api/responses/invalid-dummy-token');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/responses/:token', () => {
    it('AC-RESP-3 katılımcı anket yanıtlarını başarıyla kaydedebilmeli', async () => {
      const questions = await Question.findAll({ where: { survey_id: testSurvey.id } });
      const answers = [
        { question_id: questions[0].id, value: 5 },
        { question_id: questions[1].id, value: 'Harika bir sistem' }
      ];

      const res = await request(app)
        .post(`/api/responses/${testTarget.token}`)
        .send({
          answers,
          duration_seconds: 45
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Yanıtlarınız kaydedildi');
    });

    it('AC-RESP-4 anket tamamlandıktan sonra ikinci kez submit edildiğinde 400 Bad Request dönmeli (Çift Gönderim Engeli)', async () => {
      const res = await request(app)
        .post(`/api/responses/${testTarget.token}`)
        .send({
          answers: [],
          duration_seconds: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Bu anketi zaten doldurdunuz');
    });
  });
});
