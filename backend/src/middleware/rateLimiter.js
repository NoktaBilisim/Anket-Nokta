const rateLimit = require('express-rate-limit');

const createLimiter = (max, windowMs, message) => rateLimit({
  max, windowMs,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false
});

exports.loginLimiter = createLimiter(5, 60 * 1000, 'Çok fazla giriş denemesi. 1 dakika bekleyin.');
exports.apiLimiter = createLimiter(100, 60 * 1000, 'Çok fazla istek.');
exports.sendLimiter = createLimiter(20, 60 * 1000, 'Çok fazla gönderim isteği.');
