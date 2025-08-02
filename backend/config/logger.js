const winston = require('winston');
const path = require('path');

/**
 * Winston logger configuration for structured logging
 * Handles different log levels and outputs for development/production
 */

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    if (service) log += ` [${service}]`;
    log += `: ${message}`;
    
    // Add meta information if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Define transports based on environment
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    handleExceptions: true,
    handleRejections: true
  })
);

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, '..', 'logs');
  
  transports.push(
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Create stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Log authentication events
 * @param {string} event - Event type
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 */
logger.auth = (event, userId, email, ip, userAgent) => {
  logger.info(`Auth event: ${event}`, {
    service: 'auth',
    event,
    userId,
    email,
    ip,
    userAgent,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log database operations
 * @param {string} operation - Database operation
 * @param {string} collection - Collection name
 * @param {string} documentId - Document ID
 * @param {Object} meta - Additional metadata
 */
logger.database = (operation, collection, documentId, meta = {}) => {
  logger.info(`Database operation: ${operation}`, {
    service: 'database',
    operation,
    collection,
    documentId,
    ...meta
  });
};

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {string} ip - IP address
 * @param {Object} details - Event details
 */
logger.security = (event, ip, details = {}) => {
  logger.warn(`Security event: ${event}`, {
    service: 'security',
    event,
    ip,
    timestamp: new Date().toISOString(),
    ...details
  });
};

/**
 * Log API requests
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {number} statusCode - Response status code
 * @param {number} responseTime - Response time in ms
 * @param {string} ip - IP address
 */
logger.request = (method, url, statusCode, responseTime, ip) => {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger[level](`${method} ${url} ${statusCode}`, {
    service: 'api',
    method,
    url,
    statusCode,
    responseTime,
    ip
  });
};

module.exports = logger;