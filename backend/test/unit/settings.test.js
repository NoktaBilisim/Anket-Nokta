const { getAllSettings, getSetting, saveSettings, DEFAULTS } = require('../../src/services/settingsService');
const { seedDefaultSettings, DEFAULT_SETTINGS } = require('../../src/database/seed');
const { Setting, sequelize } = require('../../src/models');

describe('Sistem ve Marka Ayarları Birim Testleri (P-01 / settingsService & seed)', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('P01-1 DEFAULTS tablosunda app_logo ve app_title tanımlı olmalıdır', () => {
    expect(DEFAULTS).toHaveProperty('app_logo');
    expect(DEFAULTS).toHaveProperty('app_title');
    expect(DEFAULTS.app_title).toBe('SurveyPro');
    expect(DEFAULTS.app_logo).toBe('');
  });

  it('P01-2 Veritabanı boşken getAllSettings varsayılan app_logo ve app_title değerlerini dönmelidir', async () => {
    const settings = await getAllSettings();
    expect(settings.app_title).toBe('SurveyPro');
    expect(settings.app_logo).toBe('');
    expect(settings.site_url).toBeDefined();
  });

  it('P01-3 seedDefaultSettings varsayılan ayarları veritabanına başarıyla eklemelidir', async () => {
    await seedDefaultSettings();
    const count = await Setting.count();
    expect(count).toBe(DEFAULT_SETTINGS.length);

    const logoSetting = await Setting.findOne({ where: { key: 'app_logo' } });
    expect(logoSetting).not.toBeNull();
    expect(logoSetting.value).toBe('');

    const titleSetting = await Setting.findOne({ where: { key: 'app_title' } });
    expect(titleSetting).not.toBeNull();
    expect(titleSetting.value).toBe('SurveyPro');
  });

  it('P01-4 seedDefaultSettings idempotent olmalıdır (tekrar çağrıldığında hata vermez ve sayı değişmez)', async () => {
    const countBefore = await Setting.count();
    await seedDefaultSettings();
    const countAfter = await Setting.count();
    expect(countAfter).toBe(countBefore);
  });

  it('P01-5 saveSettings ile app_logo ve app_title güncellenebilmeli ve getSetting ile okunabilmelidir', async () => {
    await saveSettings({
      app_title: 'Acme Kurumsal Portal',
      app_logo: '/uploads/logos/logo_test_123.png'
    });

    const title = await getSetting('app_title');
    const logo = await getSetting('app_logo');

    expect(title).toBe('Acme Kurumsal Portal');
    expect(logo).toBe('/uploads/logos/logo_test_123.png');

    const all = await getAllSettings();
    expect(all.app_title).toBe('Acme Kurumsal Portal');
    expect(all.app_logo).toBe('/uploads/logos/logo_test_123.png');
  });
});
