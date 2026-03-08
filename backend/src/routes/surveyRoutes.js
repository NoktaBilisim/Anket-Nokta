const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', surveyController.list);
router.post('/', authorize('admin', 'creator'), surveyController.create);
router.get('/:id', surveyController.get);
router.put('/:id', authorize('admin', 'creator'), surveyController.update);
router.delete('/:id', authorize('admin', 'creator'), surveyController.remove);
router.post('/:id/send', authorize('admin', 'creator'), surveyController.send);
router.get('/:id/report', authorize('admin', 'creator', 'evaluator'), surveyController.report);
router.patch('/:id/status', authorize('admin', 'creator'), surveyController.changeStatus);

module.exports = router;
