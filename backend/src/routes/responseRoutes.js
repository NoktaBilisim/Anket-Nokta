const express = require('express');
const router = express.Router();
const responseController = require('../controllers/responseController');

// Public - token based
router.get('/token/:token', responseController.getSurveyByToken);
router.post('/token/:token', responseController.submit);

module.exports = router;
