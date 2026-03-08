require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'surveypro',
    password: process.env.DB_PASSWORD || 'surveypro_pass',
    database: process.env.DB_NAME || 'surveypro',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true' ? {
      ssl: { require: true, rejectUnauthorized: false }
    } : {},
    pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
  },
};
