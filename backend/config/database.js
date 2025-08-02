const mongoose = require('mongoose');
const winston = require('winston');

/**
 * Database connection configuration for MongoDB
 * Handles connection, error handling, and graceful shutdown
 */

// Configure mongoose options
const mongooseOptions = {
  // Connection pool settings
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  
  // Buffer settings
  bufferCommands: false, // Disable mongoose buffering
  
  // Connection behavior
  autoIndex: true, // Build indexes in production
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  heartbeatFrequencyMS: 10000, // Heartbeat frequency
};

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  try {
    // Check if MONGODB_URI is provided
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);

    winston.info(`MongoDB Connected: ${conn.connection.host}`, {
      service: 'database',
      host: conn.connection.host,
      port: conn.connection.port,
      database: conn.connection.name
    });

    // Handle connection events
    mongoose.connection.on('connected', () => {
      winston.info('Mongoose connected to MongoDB', { service: 'database' });
    });

    mongoose.connection.on('error', (err) => {
      winston.error('Mongoose connection error:', {
        service: 'database',
        error: err.message,
        stack: err.stack
      });
    });

    mongoose.connection.on('disconnected', () => {
      winston.warn('Mongoose disconnected from MongoDB', { service: 'database' });
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      winston.info('Mongoose connection closed due to application termination', {
        service: 'database'
      });
      process.exit(0);
    });

  } catch (error) {
    winston.error('Database connection failed:', {
      service: 'database',
      error: error.message,
      stack: error.stack
    });
    
    // Exit process with failure
    process.exit(1);
  }
};

/**
 * Close database connection gracefully
 * @returns {Promise<void>}
 */
const closeDatabase = async () => {
  try {
    await mongoose.connection.close();
    winston.info('Database connection closed successfully', { service: 'database' });
  } catch (error) {
    winston.error('Error closing database connection:', {
      service: 'database',
      error: error.message
    });
  }
};

/**
 * Get database connection status
 * @returns {string} Connection status
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return states[mongoose.connection.readyState] || 'unknown';
};

module.exports = {
  connectDatabase,
  closeDatabase,
  getConnectionStatus
};