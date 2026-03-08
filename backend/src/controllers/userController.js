const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'refresh_token'] },
      order: [['created_at', 'DESC']]
    });
    return success(res, users);
  } catch (err) { return error(res, err.message); }
};

exports.create = async (req, res) => {
  try {
    const { name, email, password, role, phone, whatsapp } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return error(res, 'Bu e-posta zaten kayıtlı', 400);
    const hash = await bcrypt.hash(password || 'Welcome123!', 12);
    const user = await User.create({ name, email, password: hash, role, phone, whatsapp });
    await ActivityLog.create({
      user_id: req.user.id, action: 'user_created',
      metadata: { targetEmail: email }, ip_address: req.ip
    });
    const { password: _, refresh_token: __, ...safe } = user.toJSON();
    return success(res, safe, 201);
  } catch (err) { return error(res, err.message); }
};

exports.update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'Kullanıcı bulunamadı', 404);

    const { name, role, phone, whatsapp, is_active, password } = req.body;
    const updateData = { name, role, phone, whatsapp, is_active };

    // Şifre gönderildiyse hashle ve güncelle
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    await user.update(updateData);
    await ActivityLog.create({
      user_id: req.user.id, action: 'user_updated',
      metadata: { targetId: user.id, targetEmail: user.email }, ip_address: req.ip
    });
    const { password: _, refresh_token: __, ...safe } = user.toJSON();
    return success(res, safe);
  } catch (err) { return error(res, err.message); }
};

exports.remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'Kullanıcı bulunamadı', 404);
    if (user.id === req.user.id) return error(res, 'Kendinizi silemezsiniz', 400);
    await ActivityLog.create({
      user_id: req.user.id, action: 'user_deleted',
      metadata: { targetEmail: user.email }, ip_address: req.ip
    });
    await user.destroy();
    return success(res, { message: 'Kullanıcı silindi' });
  } catch (err) { return error(res, err.message); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, whatsapp } = req.body;
    await req.user.update({ name, phone, whatsapp });
    const { password: _, refresh_token: __, ...safe } = req.user.toJSON();
    return success(res, safe);
  } catch (err) { return error(res, err.message); }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!(await bcrypt.compare(currentPassword, req.user.password)))
      return error(res, 'Mevcut şifre yanlış', 400);
    const hash = await bcrypt.hash(newPassword, 12);
    await req.user.update({ password: hash });
    return success(res, { message: 'Şifre güncellendi' });
  } catch (err) { return error(res, err.message); }
};
