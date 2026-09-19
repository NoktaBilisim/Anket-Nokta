require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosya sunumu (/uploads ve /api/uploads)
const uploadsStaticDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsStaticDir)) {
  fs.mkdirSync(uploadsStaticDir, { recursive: true });
}

const staticOptions = {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
};

app.use('/uploads', express.static(uploadsStaticDir, staticOptions));
app.use('/api/uploads', express.static(uploadsStaticDir, staticOptions));

app.use('/api', apiLimiter);
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
