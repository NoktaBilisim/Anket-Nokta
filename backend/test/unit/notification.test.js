const { normalizePhone, buildHtml, buildLink } = require('../../src/services/notificationService');

describe('Bildirim Servisi Birim Testleri', () => {
  describe('Telefon Numarası Normalizasyonu (normalizePhone)', () => {
    it('AC-NOTIFY-1 Türkiye formatındaki farklı telefon numaralarını temizlemeli', () => {
      expect(normalizePhone('+90 (532) 123 45 67')).toBe('5321234567');
      expect(normalizePhone('0532 123 4567')).toBe('5321234567');
      expect(normalizePhone('905321234567')).toBe('5321234567');
      expect(normalizePhone('5321234567')).toBe('5321234567');
    });

    it('AC-NOTIFY-2 geçersiz veya boş telefon girdilerinde boş string dönmeli', () => {
      expect(normalizePhone('')).toBe('');
      expect(normalizePhone(null)).toBe('');
      expect(normalizePhone(undefined)).toBe('');
    });
  });

  describe('E-posta HTML Şablonu (buildHtml)', () => {
    it('AC-NOTIFY-3 kurumsal şablon logo ve anket bağlantısını içermeli', () => {
      const html = buildHtml(
        'Yıllık Memnuniyet Anketi',
        'Lütfen 5 dakikanızı ayırınız',
        'http://localhost:3000/survey/test-token-123',
        'Truguard Survey',
        'http://localhost:3000'
      );

      expect(html).toContain('Yıllık Memnuniyet Anketi');
      expect(html).toContain('Lütfen 5 dakikanızı ayırınız');
      expect(html).toContain('http://localhost:3000/survey/test-token-123');
      expect(html).toContain('Truguard_logo.png');
      expect(html).toContain('Anketi Doldur');
    });
  });

  describe('Anket Bağlantısı Üretimi (buildLink)', () => {
    it('AC-NOTIFY-4 ayarlar ve token ile doğru anket URL si oluşturmalı', async () => {
      const settings = { site_url: 'https://anket.truguard.com/' };
      const link = await buildLink('secure-token-abc', settings);
      expect(link).toBe('https://anket.truguard.com/survey/secure-token-abc');
    });
  });
});
