const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;
let isRedisAvailable = false;

function getRedisClient() {
  if (redisClient) return redisClient;

  // Test ortamında Redis yoksa veya istenmiyorsa devre dışı bırakılabilir
  if (process.env.DISABLE_REDIS === 'true') {
    return null;
  }

  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT, 10) || 6379;
  const password = process.env.REDIS_PASSWORD || undefined;

  try {
    redisClient = new Redis({
      host,
      port,
      password,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) {
          // 3 denemeden sonra tekrar denemeyi yavaşlat
          return 5000;
        }
        return Math.min(times * 200, 1000);
      }
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      logger.info('Redis bağlantısı kuruldu');
    });

    redisClient.on('ready', () => {
      isRedisAvailable = true;
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      // Bağlantı hatalarını console kirliliği yapmadan logla
      if (process.env.NODE_ENV !== 'test') {
        logger.warn(`Redis bağlantı uyarısı: ${err.message}`);
      }
    });

    redisClient.on('close', () => {
      isRedisAvailable = false;
    });

    // Asenkron bağlanmayı dene
    redisClient.connect().catch(() => {
      isRedisAvailable = false;
    });

    return redisClient;
  } catch (err) {
    logger.warn(`Redis başlatılamadı: ${err.message}`);
    isRedisAvailable = false;
    return null;
  }
}

/**
 * Önbellekten değer okur (hata durumunda sessizce null döner)
 */
async function getCache(key) {
  try {
    const client = getRedisClient();
    if (!client || !isRedisAvailable) return null;
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Önbelleğe değer yazar (TTL saniye cinsindendir, varsayılan 300 sn = 5 dk)
 */
async function setCache(key, value, ttlSeconds = 300) {
  try {
    const client = getRedisClient();
    if (!client || !isRedisAvailable) return false;
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await client.set(key, serialized);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Belirli bir anahtarı önbellekten siler
 */
async function deleteCache(key) {
  try {
    const client = getRedisClient();
    if (!client || !isRedisAvailable) return false;
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Anket raporu önbelleğini temizler
 */
async function invalidateSurveyReportCache(surveyId) {
  if (!surveyId) return;
  const key = `survey:${surveyId}:report`;
  await deleteCache(key);
}

module.exports = {
  getRedisClient,
  getCache,
  setCache,
  deleteCache,
  invalidateSurveyReportCache,
};
