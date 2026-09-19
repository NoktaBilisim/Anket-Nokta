const express = require('express');
const router  = express.Router();
const sc      = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');
const { publicSettingsLimiter } = require('../middleware/rateLimiter');

// Herkese açık (No Auth)
router.get('/public', publicSettingsLimiter, sc.getPublic);

// Admin korumalı uçlar
router.use(authenticate);
router.use(authorize('admin'));

router.get('/',                    sc.get);
router.put('/',                    sc.save);
router.post('/logo',               uploadLogo, sc.uploadLogo);
router.delete('/logo',             sc.deleteLogo);
router.post('/test-smtp',          sc.testConnection);
router.post('/send-test-email',    sc.sendTestEmail);
router.post('/send-test-whatsapp', sc.sendTestWhatsApp);
router.post('/send-test-sms',      sc.sendTestSms);

module.exports = router;
