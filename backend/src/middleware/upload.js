const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { error } = require('../utils/response');
const { sanitizeSvg } = require('../utils/svgSanitizer');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads/logos');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MIME_MAP = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || ext === '.') {
      ext = MIME_MAP[file.mimetype] || '.png';
    }
    const uniqueId = crypto.randomUUID();
    cb(null, `logo_${uniqueId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

  if (allowedMimes.includes(file.mimetype) && (allowedExts.includes(ext) || !ext)) {
    cb(null, true);
  } else {
    const err = new Error('Geçersiz dosya formatı. Yalnızca PNG, JPG, JPEG, WebP ve SVG formatları desteklenir.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const maxSizeBytes = (parseInt(process.env.MAX_LOGO_SIZE_MB, 10) || 2) * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSizeBytes
  }
});

const uploadLogo = (req, res, next) => {
  const singleUpload = upload.single('logo');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return error(res, "Dosya boyutu 2MB'tan büyük olamaz.", 400);
        }
        return error(res, `Dosya yükleme hatası: ${err.message}`, 400);
      }
      return error(res, err.message || 'Dosya yüklenirken bir hata oluştu', 400);
    }

    // SVG sanitization işlemi
    if (req.file) {
      const ext = path.extname(req.file.originalname || req.file.filename).toLowerCase();
      if (req.file.mimetype === 'image/svg+xml' || ext === '.svg') {
        try {
          const rawSvg = fs.readFileSync(req.file.path, 'utf8');
          const cleanedSvg = sanitizeSvg(rawSvg);
          fs.writeFileSync(req.file.path, cleanedSvg, 'utf8');
        } catch (svgErr) {
          // Eğer okuma/yazma hatası olursa dosyayı temizle ve hata dön
          try { fs.unlinkSync(req.file.path); } catch (_) {}
          return error(res, 'SVG dosyası işlenirken güvenlik hatası oluştu', 400);
        }
      }
    }

    next();
  });
};

module.exports = { uploadLogo, uploadDir };
