const {
  isValidEmail,
  isValidUUID,
  validateSurveyCreate,
  validateSurveyUpdate,
  validateSurveyStatus,
  validateSurveySend,
  validateResponseSubmit,
  validateLogin,
  validateRegister,
  validateUserCreate,
  validateChangePassword,
} = require('../../src/utils/validate');

describe('Girdi Doğrulama Birim Testleri (P-02)', () => {
  describe('E-posta ve UUID Doğrulama', () => {
    it('AC-VALIDATE-1 geçerli ve geçersiz e-postaları doğru tespit etmeli', () => {
      expect(isValidEmail('admin@example.com')).toBe(true);
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });

    it('AC-VALIDATE-2 geçerli ve geçersiz UUID v4 değerlerini doğrulamalı', () => {
      expect(isValidUUID('c3b9b4f2-51c3-4d74-b582-89e5dc4b35e8')).toBe(true);
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('12345')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
    });
  });

  describe('Anket Oluşturma ve Güncelleme Doğrulama (AC-1)', () => {
    it('AC-1 başlığı olmayan anket için hata dönmeli', () => {
      const res = validateSurveyCreate({ title: '', questions: [] });
      expect(res.error).toBe('Anket başlığı gerekli');
    });

    it('AC-1 geçersiz soru tipi girildiğinde hata dönmeli', () => {
      const res = validateSurveyCreate({
        title: 'Müşteri Memnuniyeti',
        questions: [{ text: 'Hizmetten memnun musunuz?', type: 'invalid_type' }]
      });
      expect(res.error).toContain('geçersiz soru tipi');
    });

    it('AC-1 metni olmayan soru girildiğinde hata dönmeli', () => {
      const res = validateSurveyCreate({
        title: 'Müşteri Memnuniyeti',
        questions: [{ text: '  ', type: 'multiple_choice' }]
      });
      expect(res.error).toContain('soru metni zorunludur');
    });

    it('AC-1 geçerli anket ve sorular için hatasız dönmeli', () => {
      const res = validateSurveyCreate({
        title: 'Müşteri Memnuniyeti 2026',
        questions: [
          { text: 'Hizmet kalitesi?', type: 'rating' },
          { text: 'Tavsiye eder misiniz?', type: 'yes_no' }
        ]
      });
      expect(res.error).toBeNull();
    });

    it('AC-VALIDATE-3 anket güncelleme doğrulamasında boş başlık reddedilmeli', () => {
      const res = validateSurveyUpdate({ title: '   ' });
      expect(res.error).toBe('Anket başlığı boş olamaz');
    });
  });

  describe('Anket Durum ve Gönderim Doğrulama', () => {
    it('AC-VALIDATE-4 geçersiz anket durumu girildiğinde hata dönmeli', () => {
      const res = validateSurveyStatus('unknown_status');
      expect(res.error).toContain('Geçersiz anket durumu');
    });

    it('AC-VALIDATE-5 geçerli anket durumları kabul edilmeli', () => {
      expect(validateSurveyStatus('draft').error).toBeNull();
      expect(validateSurveyStatus('active').error).toBeNull();
      expect(validateSurveyStatus('closed').error).toBeNull();
      expect(validateSurveyStatus('archived').error).toBeNull();
    });

    it('AC-VALIDATE-6 anket gönderiminde kullanıcı seçilmemişse hata dönmeli', () => {
      const res = validateSurveySend({ userIds: [], method: 'email' });
      expect(res.error).toBe('En az bir kullanıcı seçilmelidir');
    });

    it('AC-VALIDATE-7 anket gönderiminde geçersiz kanal girilirse hata dönmeli', () => {
      const res = validateSurveySend({ userIds: ['123'], method: 'pigeon' });
      expect(res.error).toContain('Geçersiz gönderim yöntemi');
    });
  });

  describe('Kullanıcı ve Yanıt Doğrulama', () => {
    it('AC-VALIDATE-8 yanıt gönderme nesnesinde answers dizi değilse hata dönmeli', () => {
      const res = validateResponseSubmit({ answers: 'invalid' });
      expect(res.error).toBe('Yanıtlar listesi (answers) gereklidir');
    });

    it('AC-VALIDATE-9 kullanıcı girişinde e-posta ve şifre zorunlu olmalı', () => {
      expect(validateLogin({ email: 'bad-email', password: '123' }).error).toContain('Geçerli bir e-posta');
      expect(validateLogin({ email: 'admin@truguard.com', password: '' }).error).toBe('Şifre gereklidir');
    });

    it('AC-VALIDATE-10 kullanıcı kaydında şifre en az 6 karakter olmalı', () => {
      const res = validateRegister({ name: 'Ali', email: 'ali@test.com', password: '123' });
      expect(res.error).toBe('Şifre en az 6 karakter olmalıdır');
    });

    it('AC-VALIDATE-11 şifre değişiminde yeni şifre en az 6 karakter olmalı', () => {
      const res = validateChangePassword({ currentPassword: 'old', newPassword: '123' });
      expect(res.error).toBe('Yeni şifre en az 6 karakter olmalıdır');
    });
  });
});
