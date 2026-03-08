const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/',                settingsController.get);
router.put('/',                settingsController.save);
router.post('/test-smtp',      settingsController.testConnection);
router.post('/send-test-email', settingsController.sendTestEmail);

module.exports = router;
