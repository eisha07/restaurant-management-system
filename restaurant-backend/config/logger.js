/**
 * Winston Logger Configuration
 * 
 * Provides structured logging with:
 * - Console output (colorized in development)
 * - Daily rotating file logs
 * - PostgreSQL system_logs table transport
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
    const moduleTag = module ? `[${module}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${moduleTag} ${message}${metaStr}`;
  })
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');

// Daily rotating file transport for errors
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat
});

// Daily rotating file transport for all logs
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat
});

// Create the Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'restaurant-backend' },
  transports: [
    errorFileTransport,
    combinedFileTransport
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
} else {
  // In production, still log to console but with less verbosity
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.simple()
    ),
    level: 'info'
  }));
}

/**
 * Custom PostgreSQL Transport for Winston
 * Writes logs to the system_logs table
 */
class PostgresTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.sequelize = opts.sequelize;
    this.tableName = 'system_logs';
  }

  async log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    if (!this.sequelize) {
      callback();
      return;
    }

    try {
      const logLevel = info.level.toUpperCase();
      const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
      const dbLevel = validLevels.includes(logLevel) ? logLevel : 'INFO';

      await this.sequelize.query(
        `INSERT INTO ${this.tableName} (log_level, module, message, user_id, user_type, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        {
          bind: [
            dbLevel,
            info.module || 'system',
            info.message,
            info.userId || null,
            info.userType || null,
            info.ip || null,
            info.userAgent || null
          ],
          type: 'INSERT'
        }
      );
    } catch (err) {
      // Don't crash if logging to DB fails
      console.error('Failed to write log to database:', err.message);
    }

    callback();
  }
}

/**
 * Initialize database transport
 * Call this after database connection is established
 */
function initializeDatabaseTransport(sequelize) {
  if (sequelize) {
    const dbTransport = new PostgresTransport({
      sequelize,
      level: 'info' // Only log info and above to database
    });
    logger.add(dbTransport);
    logger.info('Database logging transport initialized', { module: 'logger' });
  }
}

/**
 * Create a child logger with a specific module name
 */
function createModuleLogger(moduleName) {
  return logger.child({ module: moduleName });
}

// Morgan stream for HTTP request logging
const morganStream = {
  write: (message) => {
    // Remove newline and log as HTTP request
    logger.info(message.trim(), { module: 'http' });
  }
};

module.exports = {
  logger,
  createModuleLogger,
  initializeDatabaseTransport,
  morganStream,
  PostgresTransport
};
