const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return error(res, 'Geçersiz e-posta veya şifre', 401);

    const tokens = generateTokens(user);
    await user.update({ refresh_token: tokens.refreshToken });

    await ActivityLog.create({ user_id: user.id, action: 'user_login', ip_address: req.ip });

    return success(res, { user: sanitize(user), ...tokens });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return error(res, 'Bu e-posta zaten kayıtlı', 400);

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash, role: role || 'participant' });
    const tokens = generateTokens(user);
    await user.update({ refresh_token: tokens.refreshToken });

    return success(res, { user: sanitize(user), ...tokens }, 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token gerekli', 400);

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findOne({ where: { id: payload.id, refresh_token: refreshToken } });
    if (!user) return error(res, 'Geçersiz token', 401);

    const tokens = generateTokens(user);
    await user.update({ refresh_token: tokens.refreshToken });
    return success(res, tokens);
  } catch (err) {
    return error(res, 'Geçersiz token', 401);
  }
};

exports.logout = async (req, res) => {
  try {
    await req.user.update({ refresh_token: null });
    await ActivityLog.create({ user_id: req.user.id, action: 'user_logout', ip_address: req.ip });
    return success(res, { message: 'Çıkış yapıldı' });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.me = async (req, res) => {
  return success(res, sanitize(req.user));
};

function sanitize(user) {
  const { password, refresh_token, ...safe } = user.toJSON();
  return safe;
}
