const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// Dosyayı memory'de tut (disk yerine buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',  // .xls
      'text/csv',
      'application/csv',
    ];
    const ext = file.originalname.toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece .xlsx, .xls veya .csv dosyası yüklenebilir'));
    }
  }
});

router.use(authenticate);
router.get('/',                                          authorize('admin'), userController.list);
router.post('/',                                         authorize('admin'), userController.create);
router.post('/import', upload.single('file'),            authorize('admin'), userController.importExcel);
router.put('/:id',                                       authorize('admin'), userController.update);
router.delete('/:id',                                    authorize('admin'), userController.remove);
router.put('/me/profile',                                                    userController.updateProfile);
router.put('/me/password',                                                   userController.changePassword);

module.exports = router;
