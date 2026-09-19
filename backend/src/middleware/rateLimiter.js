const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

const createLimiter = (max, windowMs, message) => rateLimit({
  max: isTest ? 10000 : max,
  windowMs,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest
});

exports.loginLimiter = createLimiter(5, 60 * 1000, 'Çok fazla giriş denemesi. 1 dakika bekleyin.');
exports.apiLimiter = createLimiter(100, 60 * 1000, 'Çok fazla istek.');
exports.sendLimiter = createLimiter(30, 60 * 1000, 'Çok fazla gönderim isteği.');
