const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('admin'), logController.list);
router.get('/stats', logController.stats);
router.get('/my-surveys', logController.mySurveys);

module.exports = router;
