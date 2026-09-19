/**
 * SurveyPro Ortak Girdi Doğrulama Yardımcıları
 */

// Basit ve güvenli e-posta regex doğrulaması
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_ROLES = ['admin', 'creator', 'evaluator', 'participant'];
const VALID_STATUSES = ['draft', 'active', 'closed', 'archived'];
const VALID_QUESTION_TYPES = ['multiple_choice', 'text', 'rating', 'yes_no', 'matrix'];
const VALID_SEND_METHODS = ['email', 'sms', 'whatsapp'];

/**
 * E-posta formatını doğrular
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * UUIDv4 formatını doğrular
 */
function isValidUUID(id) {
  if (typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Soru nesnesini doğrular
 */
function validateQuestion(q, index = 0) {
  if (!q || typeof q !== 'object') {
    return `Soru ${index + 1} geçerli bir nesne olmalıdır`;
  }
  if (!q.text || typeof q.text !== 'string' || !q.text.trim()) {
    return `Soru ${index + 1} için soru metni zorunludur`;
  }
  if (!q.type || !VALID_QUESTION_TYPES.includes(q.type)) {
    return `Soru ${index + 1} için geçersiz soru tipi: ${q.type}`;
  }
  return null;
}

/**
 * Anket oluşturma girdisini doğrular (AC-1)
 */
function validateSurveyCreate(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Geçersiz istek gövdesi' };
  }
  const { title, questions } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return { error: 'Anket başlığı gerekli' };
  }
  if (questions !== undefined) {
    if (!Array.isArray(questions)) {
      return { error: 'Sorular bir dizi olmalıdır' };
    }
    for (let i = 0; i < questions.length; i++) {
      const qErr = validateQuestion(questions[i], i);
      if (qErr) return { error: qErr };
    }
  }
  return { error: null };
}

/**
 * Anket güncelleme girdisini doğrular
 */
function validateSurveyUpdate(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Geçersiz istek gövdesi' };
  }
  const { title, questions } = body;
  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return { error: 'Anket başlığı boş olamaz' };
  }
  if (questions !== undefined) {
    if (!Array.isArray(questions)) {
      return { error: 'Sorular bir dizi olmalıdır' };
    }
    for (let i = 0; i < questions.length; i++) {
      const qErr = validateQuestion(questions[i], i);
      if (qErr) return { error: qErr };
    }
  }
  return { error: null };
}

/**
 * Anket durum değişikliğini doğrular
 */
function validateSurveyStatus(status) {
  if (!status || !VALID_STATUSES.includes(status)) {
    return { error: `Geçersiz anket durumu. Geçerli durumlar: ${VALID_STATUSES.join(', ')}` };
  }
  return { error: null };
}

/**
 * Anket gönderim girdisini doğrular
 */
function validateSurveySend(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Geçersiz istek gövdesi' };
  }
  const { userIds, method } = body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { error: 'En az bir kullanıcı seçilmelidir' };
  }
  if (!method || !VALID_SEND_METHODS.includes(method)) {
    return { error: `Geçersiz gönderim yöntemi. Geçerli yöntemler: ${VALID_SEND_METHODS.join(', ')}` };
  }
  return { error: null };
}

/**
 * Katılımcı anket tamamlama girdisini doğrular
 */
function validateResponseSubmit(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Geçersiz istek gövdesi' };
  }
  const { answers, duration_seconds } = body;
  if (!Array.isArray(answers)) {
    return { error: 'Yanıtlar listesi (answers) gereklidir' };
  }
  if (duration_seconds !== undefined && duration_seconds !== null) {
    if (typeof duration_seconds !== 'number' || duration_seconds < 0) {
      return { error: 'Süre (duration_seconds) sıfır veya pozitif bir sayı olmalıdır' };
    }
  }
  return { error: null };
}

/**
 * Kullanıcı girişini doğrular
 */
function validateLogin(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Geçersiz istek gövdesi' };
  }
  const { email, password } = body;
  if (!email || !isValidEmail(email)) {
    return { error: 'Geçerli bir e-posta adresi gereklidir' };
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    return { error: 'Şifre gereklidir' };
  }
  return { error: null };
}

/**
 * Kullanıcı kaydını doğrular (Açık kayıt daima participant rolündedir)
 */
function validateRegister(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Geçersiz istek gövdesi' };
  }
  const { name, email, password } = body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { error: 'Ad Soyad gereklidir' };
  }
  if (!email || !isValidEmail(email)) {
    return { error: 'Geçerli bir e-posta adresi gereklidir' };
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return { error: 'Şifre en az 6 karakter olmalıdır' };
  }
  return { error: null };
}

/**
 * Kullanıcı oluşturmayı doğrular (Admin)
 */
function validateUserCreate(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Geçersiz istek gövdesi' };
  }
  const { name, email, role } = body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { error: 'Ad Soyad gereklidir' };
  }
  if (!email || !isValidEmail(email)) {
    return { error: 'Geçerli bir e-posta adresi gereklidir' };
  }
  if (role && !VALID_ROLES.includes(role)) {
    return { error: `Geçersiz rol. Geçerli roller: ${VALID_ROLES.join(', ')}` };
  }
  return { error: null };
}

/**
 * Şifre değiştirmeyi doğrular
 */
function validateChangePassword(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Geçersiz istek gövdesi' };
  }
  const { currentPassword, newPassword } = body;
  if (!currentPassword || typeof currentPassword !== 'string') {
    return { error: 'Mevcut şifre gereklidir' };
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return { error: 'Yeni şifre en az 6 karakter olmalıdır' };
  }
  return { error: null };
}

module.exports = {
  EMAIL_REGEX,
  UUID_REGEX,
  VALID_ROLES,
  VALID_STATUSES,
  VALID_QUESTION_TYPES,
  VALID_SEND_METHODS,
  isValidEmail,
  isValidUUID,
  validateSurveyCreate,
  validateSurveyUpdate,
  validateSurveyStatus,
  validateSurveySend,
  validateResponseSubmit,
  validateLogin,
  validateRegister,
  validateUserCreate,
  validateChangePassword,
};
