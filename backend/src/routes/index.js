const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const logger = require('../utils/logger');
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

// Liveness Probe: Servisin ayakta olup olmadığını bildirir
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Readiness Probe: Veritabanı bağlantısı ve hazır oluş durumunu kontrol eder
router.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ready',
      database: 'connected',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Readiness probe failed:', err);
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      error: 'Veritabanı servisi hazır değil',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
