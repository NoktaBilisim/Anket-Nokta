const errorHandler = require('../../src/middleware/errorHandler');
const { getAllSettings } = require('../../src/services/settingsService');
const { sequelize } = require('../../src/models');

describe('Güvenlik ve Konfigürasyon Birim Testleri (SEC-01 - SEC-05)', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync();
  });

  describe('Hata Yönetimi ve Bilgi Sızıntısı Önleme (errorHandler)', () => {
    it('SEC-01 Production ortamında 500 hatalarında iç hata detayları gizlenmeli ve genel mesaj dönmeli', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockReq = { path: '/api/surveys', method: 'GET' };
      const mockRes = {
        statusCode: null,
        data: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.data = data;
          return this;
        }
      };

      const internalError = new Error('SELECT * FROM secret_table syntax error at index 42');
      errorHandler(internalError, mockReq, mockRes, () => {});

      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.data.success).toBe(false);
      expect(mockRes.data.message).toBe('Sunucu hatası oluştu');
      expect(mockRes.data.message).not.toContain('SELECT');

      process.env.NODE_ENV = prevEnv;
    });

    it('SEC-02 Production ortamında dahi 4xx kullanıcı hataları açık mesajını korumalı', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockReq = { path: '/api/auth/login', method: 'POST' };
      const mockRes = {
        statusCode: null,
        data: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.data = data;
          return this;
        }
      };

      const clientError = new Error('E-posta veya şifre hatalı');
      clientError.status = 401;
      errorHandler(clientError, mockReq, mockRes, () => {});

      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.data.success).toBe(false);
      expect(mockRes.data.message).toBe('E-posta veya şifre hatalı');

      process.env.NODE_ENV = prevEnv;
    });
  });

  describe('Hassas Bilgi ve API Anahtarları İzolasyonu (settingsService & jwt)', () => {
    it('SEC-03 settingsService içinde hardcoded SMS veya harici servis anahtarları bulunmamalı', async () => {
      const settings = await getAllSettings();
      expect(settings.sms_api_key).not.toBe('9c0a341a3713db45c5f1786bcee5e270f672d0e42666510d');
      expect(typeof settings.sms_api_key).toBe('string');
    });

    it('SEC-04 Production ortamında JWT_SECRET tanımlı değilse jwt modülü hata fırlatmalı', () => {
      const prevNodeEnv = process.env.NODE_ENV;
      const prevSecret = process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      expect(() => {
        jest.isolateModules(() => {
          require('../../src/utils/jwt');
        });
      }).toThrow('JWT_SECRET');

      process.env.NODE_ENV = prevNodeEnv;
      if (prevSecret) process.env.JWT_SECRET = prevSecret;
    });
  });
});
