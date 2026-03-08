const express = require('express');
const router = express.Router();
const authRoutes     = require('./authRoutes');
const surveyRoutes   = require('./surveyRoutes');
const responseRoutes = require('./responseRoutes');
const userRoutes     = require('./userRoutes');
const logRoutes      = require('./logRoutes');
const settingsRoutes = require('./settingsRoutes');

router.use('/auth',     authRoutes);
router.use('/surveys',  surveyRoutes);
router.use('/responses', responseRoutes);
router.use('/users',    userRoutes);
router.use('/logs',     logRoutes);
router.use('/settings', settingsRoutes);

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

module.exports = router;
