require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5001;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    // alter:true — yeni sütunları (örn. category) otomatik ekler, veri kaybı olmaz
    await sequelize.sync({ alter: true });
    logger.info('Models synced');

    // Seed her ortamda çalışır — kullanıcı yoksa admin oluşturur, varsa atlar
    const { seedDatabase } = require('./database/seed');
    await seedDatabase();

    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (err) {
    logger.error('Startup error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = { app, start };
