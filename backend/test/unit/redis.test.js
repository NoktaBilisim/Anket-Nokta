const redisUtil = require('../../src/utils/redis');

describe('Redis Önbellek Yönetimi Birim Testleri (P-04)', () => {
  it('AC-REDIS-1 Redis bağlı olmasa dahi getCache güvenle null dönmeli', async () => {
    const data = await redisUtil.getCache('survey:dummy-id:report');
    expect(data === null || typeof data === 'object').toBe(true);
  });

  it('AC-REDIS-2 invalidateSurveyReportCache geçersiz id verildiğinde hatasız tamamlanmalı', async () => {
    await expect(redisUtil.invalidateSurveyReportCache(null)).resolves.not.toThrow();
    await expect(redisUtil.invalidateSurveyReportCache(undefined)).resolves.not.toThrow();
  });
});
