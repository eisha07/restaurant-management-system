// config/database.js - CORRECTED VERSION
const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('Database configuration:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '*** (set)' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '*** (set)' : 'NOT SET');

let sequelize;

try {
  if (process.env.DATABASE_URL) {
    // Option 1: Using connection string (standard for cloud DBs)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        statement_timeout: 5000
      },
      logging: (msg) => console.log('[SQL]', msg),
      pool: {
        max: 5,
        min: 0,
        acquire: 5000,
        idle: 10000
      }
    });
  } else {
    // Option 2: Using separate variables
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        dialectOptions: {
          ssl: (process.env.DB_HOST === 'localhost' || !process.env.DB_HOST) ? false : {
            require: true,
            rejectUnauthorized: false
          },
          statement_timeout: 5000
        },
        logging: (msg) => console.log('[SQL]', msg),
        pool: {
          max: 5,
          min: 0,
          acquire: 5000,
          idle: 10000
        }
      }
    );
  }
  
  console.log('✅ Sequelize instance created successfully');
} catch (error) {
  console.error('❌ Error creating Sequelize instance:', error.message);
  throw error;
}

// Test connection function with timeout
const testConnection = async () => {
  try {
    // Create a timeout promise that rejects after 10 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout (10s)')), 10000)
    );
    
    // Race between the connection attempt and timeout
    await Promise.race([sequelize.authenticate(), timeoutPromise]);
    console.log('✅ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };