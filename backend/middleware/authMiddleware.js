const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/tokenUtils');
const logger = require('../config/logger');

/**
 * Authentication middleware functions
 * Handles JWT verification, user authentication, and role-based access control
 */

/**
 * Middleware to verify JWT token and authenticate user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const verifyJWT = async (req, res, next) => {
  try {
    // Extract token from Authorization header or cookies
    let token = extractTokenFromHeader(req.headers.authorization);
    
    // Fallback to cookie if no header token
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // Check if token exists
    if (!token) {
      logger.security('Authentication attempt without token', req.ip, {
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Find user in database
    const user = await User.findById(decoded.userId).select('+loginAttempts +lockUntil');
    
    if (!user) {
      logger.security('Authentication attempt with invalid user ID', req.ip, {
        userId: decoded.userId,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      logger.security('Authentication attempt with inactive account', req.ip, {
        userId: user._id,
        email: user.email
      });
      
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logger.security('Authentication attempt with locked account', req.ip, {
        userId: user._id,
        email: user.email,
        lockUntil: user.lockUntil
      });
      
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts.',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Update API usage tracking
    await user.updateApiUsage();

    // Attach user to request object
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    // Log successful authentication
    logger.auth('Token verified', user._id, user.email, req.ip, req.get('User-Agent'));

    next();
  } catch (error) {
    logger.security('JWT verification failed', req.ip, {
      error: error.message,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });

    // Handle specific JWT errors
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Middleware to require authentication (alias for verifyJWT)
 */
const requireAuth = verifyJWT;

/**
 * Middleware to check if user has specific role
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} Middleware function
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      // Convert single role to array
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // Check if user has any of the required roles
      if (!requiredRoles.includes(req.user.role)) {
        logger.security('Authorization failed - insufficient role', req.ip, {
          userId: req.user._id,
          userRole: req.user.role,
          requiredRoles,
          url: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredRoles,
          current: req.user.role
        });
      }

      // Log successful authorization
      logger.auth('Role authorization passed', req.user._id, req.user.email, req.ip, req.get('User-Agent'));

      next();
    } catch (error) {
      logger.error('Role check error:', {
        service: 'auth',
        error: error.message,
        userId: req.user?._id,
        requiredRoles: roles
      });

      return res.status(500).json({
        success: false,
        message: 'Authorization check failed.',
        code: 'AUTH_CHECK_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = checkRole('admin');

/**
 * Middleware to check if user account is verified
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const requireVerified = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!req.user.isVerified) {
      logger.security('Access attempt with unverified account', req.ip, {
        userId: req.user._id,
        email: req.user.email,
        url: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        message: 'Email verification required. Please verify your email address.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    next();
  } catch (error) {
    logger.error('Email verification check error:', {
      service: 'auth',
      error: error.message,
      userId: req.user?._id
    });

    return res.status(500).json({
      success: false,
      message: 'Verification check failed.',
      code: 'VERIFICATION_CHECK_ERROR'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Extract token
    let token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // If no token, continue without authentication
    if (!token) {
      return next();
    }

    // Try to verify token
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.token = token;
        req.tokenPayload = decoded;
        
        // Update API usage
        await user.updateApiUsage();
      }
    } catch (error) {
      // Token verification failed, but we continue without authentication
      logger.debug('Optional auth token verification failed:', {
        service: 'auth',
        error: error.message,
        ip: req.ip
      });
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', {
      service: 'auth',
      error: error.message,
      ip: req.ip
    });

    // Continue without authentication on error
    next();
  }
};

/**
 * Middleware to check API rate limits per user
 * @param {number} maxRequests - Maximum requests per day
 * @returns {Function} Middleware function
 */
const checkApiLimit = (maxRequests = 1000) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      if (req.user.apiUsage.requestCount > maxRequests) {
        logger.security('API rate limit exceeded', req.ip, {
          userId: req.user._id,
          requestCount: req.user.apiUsage.requestCount,
          maxRequests,
          url: req.originalUrl
        });

        return res.status(429).json({
          success: false,
          message: 'API rate limit exceeded. Please try again tomorrow.',
          code: 'API_LIMIT_EXCEEDED',
          limit: maxRequests,
          current: req.user.apiUsage.requestCount,
          resetTime: new Date(req.user.apiUsage.lastReset.getTime() + 24 * 60 * 60 * 1000)
        });
      }

      next();
    } catch (error) {
      logger.error('API limit check error:', {
        service: 'auth',
        error: error.message,
        userId: req.user?._id
      });

      next(); // Continue on error
    }
  };
};

module.exports = {
  verifyJWT,
  requireAuth,
  checkRole,
  requireAdmin,
  requireVerified,
  optionalAuth,
  checkApiLimit
};