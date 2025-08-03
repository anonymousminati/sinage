const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const logger = require('../config/logger');

/**
 * Security middleware configuration
 * Implements comprehensive security measures for the Express application
 */

/**
 * CORS configuration
 * Allows requests from specific origins with credentials
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from frontend URL and localhost for development
    const allowedOrigins = [
      'http://localhost:5174', 
      'http://localhost:5175', 
      "*", // Allow all origins for development
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173', // Vite default port
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ].filter(Boolean); // Remove undefined values

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.security('CORS violation attempt', origin, {
        origin,
        allowedOrigins
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Forwarded-For',
    'X-Real-IP'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // Cache preflight response for 24 hours
};

/**
 * Helmet configuration for security headers
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for development
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
};

/**
 * General rate limiting
 * Limits requests per IP address
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('General rate limit exceeded', req.ip, {
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      attempts: req.rateLimit.current
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * API rate limiting (more restrictive)
 * For API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window per IP
  message: {
    success: false,
    message: 'API rate limit exceeded. Please try again later.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to avoid IPv6 issues
  // The default keyGenerator handles IPv6 properly
  handler: (req, res) => {
    logger.security('API rate limit exceeded', req.ip, {
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      userId: req.user?._id
    });

    res.status(429).json({
      success: false,
      message: 'API rate limit exceeded. Please try again later.',
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Upload rate limiting
 * For file upload endpoints
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    message: 'Upload rate limit exceeded. Please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Slow down middleware
 * Progressively delays responses as limit is approached
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per window at full speed
  delayMs: () => 500, // Fixed 500ms delay per request after delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  validate: {
    delayMs: false // Disable the delayMs warning
  }
});

/**
 * Request size limiting middleware
 * Prevents large payloads
 */
const requestSizeLimiter = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    logger.security('Request size limit exceeded', req.ip, {
      contentLength: req.headers['content-length'],
      maxSize,
      url: req.originalUrl
    });

    return res.status(413).json({
      success: false,
      message: 'Request too large',
      code: 'PAYLOAD_TOO_LARGE',
      maxSize: maxSize
    });
  }
  
  next();
};

/**
 * IP whitelist middleware (for admin endpoints)
 * Restricts access to specific IP addresses
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No restrictions if no IPs specified
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.security('IP whitelist violation', clientIP, {
        url: req.originalUrl,
        allowedIPs,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address',
        code: 'IP_NOT_ALLOWED'
      });
    }

    next();
  };
};

/**
 * Request logging middleware
 * Logs all incoming requests
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - start;
    
    // Log request
    logger.request(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      req.ip
    );

    // Log security events for failed auth
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.security('Authentication/Authorization failure', req.ip, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        userId: req.user?._id
      });
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Security headers middleware
 * Adds custom security headers
 */
const securityHeaders = (req, res, next) => {
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // API-specific headers
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * User agent validation middleware
 * Blocks suspicious user agents
 */
const userAgentValidator = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  // Block requests without user agent
  if (!userAgent) {
    logger.security('Request without user agent', req.ip, {
      url: req.originalUrl
    });

    return res.status(400).json({
      success: false,
      message: 'User agent is required',
      code: 'NO_USER_AGENT'
    });
  }

  // Block known malicious user agents
  const maliciousPatterns = [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /masscan/i,
    /zap/i,
    /burp/i
  ];

  const isMalicious = maliciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isMalicious) {
    logger.security('Malicious user agent detected', req.ip, {
      userAgent,
      url: req.originalUrl
    });

    return res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'BLOCKED_USER_AGENT'
    });
  }

  next();
};

/**
 * Content type validation middleware
 * Ensures proper content types for API requests
 */
const contentTypeValidator = (req, res, next) => {
  // Skip validation for GET requests and file uploads
  if (req.method === 'GET' || req.path.includes('/upload')) {
    return next();
  }

  const contentType = req.get('Content-Type');
  
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type. Expected application/json or multipart/form-data',
        code: 'INVALID_CONTENT_TYPE'
      });
    }
  }

  next();
};

module.exports = {
  corsOptions,
  helmetOptions,
  generalLimiter,
  apiLimiter,
  uploadLimiter,
  speedLimiter,
  requestSizeLimiter,
  ipWhitelist,
  requestLogger,
  securityHeaders,
  userAgentValidator,
  contentTypeValidator,
  
  // Express middleware functions
  cors: cors(corsOptions),
  helmet: helmet(helmetOptions),
  mongoSanitize: mongoSanitize(),
  hpp: hpp({
    whitelist: ['tags', 'categories', 'fields'] // Allow arrays for these fields
  })
};