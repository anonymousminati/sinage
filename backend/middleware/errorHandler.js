const logger = require('../config/logger');

/**
 * Error handling middleware
 * Centralized error handling for the Express application
 */

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper
 * Wraps async functions to catch errors automatically
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle MongoDB CastError
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

/**
 * Handle MongoDB duplicate key error
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, 409, 'DUPLICATE_FIELD');
};

/**
 * Handle MongoDB validation error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

/**
 * Handle JWT error
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Handle Multer file upload errors
 */
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Please upload a smaller file.', 400, 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field. Please check your form data.', 400, 'UNEXPECTED_FILE');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Please reduce the number of files.', 400, 'TOO_MANY_FILES');
  }
  return new AppError('File upload error. Please try again.', 400, 'UPLOAD_ERROR');
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
  // Log error
  logger.error('Development error:', {
    service: 'error-handler',
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id
  });

  // API error response
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err,
      message: err.message,
      code: err.code || 'INTERNAL_ERROR',
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    });
  }

  // Rendered error page (if serving HTML)
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // Log error
  logger.error('Production error:', {
    service: 'error-handler',
    error: err.message,
    statusCode: err.statusCode,
    code: err.code,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    isOperational: err.isOperational
  });

  // API error response
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'OPERATIONAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    // Programming or other unknown error: don't leak error details
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Rendered error page (if serving HTML)
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);

    sendErrorProd(error, req, res);
  }
};

/**
 * Handle unhandled routes (404)
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND');
  
  logger.security('404 - Route not found', req.ip, {
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id
  });

  next(err);
};

/**
 * Database connection error handler
 */
const handleDBConnectionError = (err) => {
  logger.error('Database connection error:', {
    service: 'database',
    error: err.message,
    stack: err.stack
  });

  process.exit(1);
};

/**
 * Unhandled promise rejection handler
 */
const handleUnhandledRejection = (err, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    service: 'process',
    error: err.message,
    stack: err.stack,
    promise: promise
  });

  // Close server gracefully
  process.exit(1);
};

/**
 * Uncaught exception handler
 */
const handleUncaughtException = (err) => {
  logger.error('Uncaught Exception:', {
    service: 'process',
    error: err.message,
    stack: err.stack
  });

  // Close server gracefully
  process.exit(1);
};

/**
 * Validation error formatter
 * Formats express-validator errors
 */
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }));
};

/**
 * Custom error response formatter
 */
const createErrorResponse = (message, statusCode = 500, code = null, details = null) => {
  return {
    success: false,
    message,
    code,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
};

/**
 * Request timeout handler
 */
const timeoutHandler = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      const err = new AppError('Request timeout. Please try again.', 408, 'REQUEST_TIMEOUT');
      next(err);
    }, timeout);

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
};

/**
 * Health check endpoint error handler
 */
const healthCheckError = (error) => {
  logger.error('Health check failed:', {
    service: 'health-check',
    error: error.message,
    stack: error.stack
  });

  return {
    status: 'unhealthy',
    error: error.message,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  AppError,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  handleDBConnectionError,
  handleUnhandledRejection,
  handleUncaughtException,
  formatValidationErrors,
  createErrorResponse,
  timeoutHandler,
  healthCheckError
};