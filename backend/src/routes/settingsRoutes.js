const express = require('express');
const router  = express.Router();
const sc      = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/',                    sc.get);
router.put('/',                    sc.save);
router.post('/test-smtp',          sc.testConnection);
router.post('/send-test-email',    sc.sendTestEmail);
router.post('/send-test-whatsapp', sc.sendTestWhatsApp);
router.post('/send-test-sms',      sc.sendTestSms);

module.exports = router;
