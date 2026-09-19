const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'test' && !process.env.USE_REAL_POSTGRES) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'surveypro',
    process.env.DB_USER || 'surveypro',
    process.env.DB_PASSWORD || 'surveypro123',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? false : false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
    }
  );
}

module.exports = sequelize;
