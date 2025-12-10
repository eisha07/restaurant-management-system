// config/database.js - CORRECTED VERSION
const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('Database configuration:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '*** (set)' : 'NOT SET');

let sequelize;

try {
  // Option 1: Using separate variables (more reliable)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        statement_timeout: 5000 // 5 second query timeout
      },
      logging: false, // Disable verbose logging
      pool: {
        max: 5,
        min: 0,
        acquire: 5000, // Reduced from 30s to 5s
        idle: 10000
      },
      connectionTimeoutMillis: 5000, // 5 second connection timeout
      idleTimeoutMillis: 10000
    }
  );
  
  console.log('✅ Sequelize instance created');
} catch (error) {
  console.error('❌ Error creating Sequelize instance:', error.message);
  throw error;
}

// Test connection function
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };