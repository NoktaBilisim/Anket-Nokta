const jwt = require('jsonwebtoken');

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET ortam değişkeni production ortamında tanımlanmalıdır.');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET ortam değişkeni production ortamında tanımlanmalıdır.');
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'surveypro_jwt_secret_default_development_key_minimum_64_characters_safe';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'surveypro_refresh_jwt_secret_default_development_key_minimum_64_safe';

exports.generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

exports.JWT_SECRET = JWT_SECRET;
exports.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;
