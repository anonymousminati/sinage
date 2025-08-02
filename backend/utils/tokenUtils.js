const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * JWT token utility functions
 * Handles token generation, verification, and management
 */

/**
 * Generate access token
 * @param {Object} payload - Token payload (usually user ID and role)
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '24h') => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn,
      issuer: 'sinage-platform',
      audience: 'sinage-users'
    });

    logger.debug('Access token generated successfully', {
      service: 'auth',
      userId: payload.userId,
      expiresIn
    });

    return token;
  } catch (error) {
    logger.error('Error generating access token:', {
      service: 'auth',
      error: error.message,
      payload: { ...payload, password: undefined } // Don't log sensitive data
    });
    throw new Error('Token generation failed');
  }
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload, expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d') => {
  try {
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not defined');
    }

    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn,
      issuer: 'sinage-platform',
      audience: 'sinage-refresh'
    });

    logger.debug('Refresh token generated successfully', {
      service: 'auth',
      userId: payload.userId,
      expiresIn
    });

    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', {
      service: 'auth',
      error: error.message,
      payload: { ...payload, password: undefined }
    });
    throw new Error('Refresh token generation failed');
  }
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'sinage-platform',
      audience: 'sinage-users'
    });

    logger.debug('Access token verified successfully', {
      service: 'auth',
      userId: decoded.userId
    });

    return decoded;
  } catch (error) {
    logger.warn('Access token verification failed:', {
      service: 'auth',
      error: error.message,
      tokenPresent: !!token
    });
    
    // Return specific error types for better error handling
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not active yet');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    if (!token) {
      throw new Error('Refresh token is required');
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'sinage-platform',
      audience: 'sinage-refresh'
    });

    logger.debug('Refresh token verified successfully', {
      service: 'auth',
      userId: decoded.userId
    });

    return decoded;
  } catch (error) {
    logger.warn('Refresh token verification failed:', {
      service: 'auth',
      error: error.message,
      tokenPresent: !!token
    });
    
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} user - User object
 * @returns {Object} Token pair with expiration times
 */
const generateTokenPair = (user) => {
  try {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: user._id.toString() });

    // Calculate expiration times
    const accessTokenExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    
    const accessTokenExpiresAt = new Date(Date.now() + parseExpirationTime(accessTokenExpiresIn));
    const refreshTokenExpiresAt = new Date(Date.now() + parseExpirationTime(refreshTokenExpiresIn));

    logger.info('Token pair generated successfully', {
      service: 'auth',
      userId: user._id.toString(),
      email: user.email
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      tokenType: 'Bearer'
    };
  } catch (error) {
    logger.error('Error generating token pair:', {
      service: 'auth',
      error: error.message,
      userId: user._id
    });
    throw error;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  // Check for Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  // Return the header value if it doesn't follow Bearer format (for backwards compatibility)
  return authHeader;
};

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} Random hex token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash token using SHA256
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Parse expiration time string to milliseconds
 * @param {string} expirationTime - Time string (e.g., '24h', '7d', '30m')
 * @returns {number} Time in milliseconds
 */
const parseExpirationTime = (expirationTime) => {
  const regex = /^(\d+)([smhd])$/;
  const match = expirationTime.match(regex);
  
  if (!match) {
    throw new Error('Invalid expiration time format');
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers = {
    s: 1000,        // seconds
    m: 60 * 1000,   // minutes
    h: 60 * 60 * 1000,  // hours
    d: 24 * 60 * 60 * 1000  // days
  };
  
  return value * multipliers[unit];
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  extractTokenFromHeader,
  generateSecureToken,
  hashToken,
  parseExpirationTime,
  isTokenExpired,
  getTokenExpiration
};