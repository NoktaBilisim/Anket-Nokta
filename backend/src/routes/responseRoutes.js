const express = require('express');
const router = express.Router();
const responseController = require('../controllers/responseController');

// Public - token based (hem /token/:token hem de /:token desteği)
router.get('/token/:token', responseController.getSurveyByToken);
router.post('/token/:token', responseController.submit);

router.get('/:token', responseController.getSurveyByToken);
router.post('/:token', responseController.submit);

module.exports = router;
