const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req?.path, method: req?.method });
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = (isProduction && status === 500)
    ? 'Sunucu hatası oluştu'
    : (err.message || 'Sunucu hatası');

  res.status(status).json({ success: false, message });
};
