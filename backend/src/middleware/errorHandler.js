const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || 'Sunucu hatası' });
};
