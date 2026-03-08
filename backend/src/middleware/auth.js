const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { error } = require('../utils/response');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return error(res, 'Token gerekli', 401);
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user || !user.is_active) return error(res, 'Kullanıcı bulunamadı', 401);
    req.user = user;
    next();
  } catch (err) {
    return error(res, 'Geçersiz token', 401);
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return error(res, 'Yetkisiz', 403);
  next();
};
