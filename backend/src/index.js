require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { sequelize } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    // alter:true yerine force:false kullan — mevcut tabloları koru, sadece eksik olanları ekle
    // Foreign key constraint hatalarını önlemek için alter kapalı
    await sequelize.sync({ force: false });
    logger.info('Models synced');

    if (process.env.NODE_ENV === 'development') {
      const { seedDatabase } = require('./database/seed');
      await seedDatabase();
    }

    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (err) {
    logger.error('Startup error:', err);
    process.exit(1);
  }
}

start();
