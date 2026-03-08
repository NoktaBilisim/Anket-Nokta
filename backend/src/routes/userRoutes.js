const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('admin'), userController.list);
router.post('/', authorize('admin'), userController.create);
router.put('/:id', authorize('admin'), userController.update);
router.delete('/:id', authorize('admin'), userController.remove);
router.put('/me/profile', userController.updateProfile);
router.put('/me/password', userController.changePassword);

module.exports = router;
