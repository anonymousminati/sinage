const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  verifyEmail,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const {
  verifyJWT,
  requireAuth,
  checkRole,
  requireAdmin
} = require('../middleware/authMiddleware');

const {
  validateRegister,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateProfileUpdate,
  validateToken,
  validateRefreshToken
} = require('../utils/validators');

const logger = require('../config/logger');

const router = express.Router();

/**
 * Authentication Routes
 * Handles user registration, login, logout, password reset, and profile management
 */

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_REQUESTS) || 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Rate limit exceeded for auth endpoint', req.ip, {
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      attempts: req.rateLimit.current
    });

    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: req.rateLimit.resetTime
    });
  },
  // Skip rate limiting for successful requests
  skip: (req, res) => res.statusCode < 400
});

// More strict rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
    code: 'PASSWORD_RESET_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to avoid IPv6 issues
  // The default keyGenerator handles IPv6 properly
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again later.',
      code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Registration rate limiting
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour per IP
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    code: 'REGISTRATION_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  registrationLimiter,
  validateRegister,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post('/login',
  authLimiter,
  validateLogin,
  login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear tokens
 * @access  Private
 */
router.post('/logout',
  requireAuth,
  logout
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token',
  validateRefreshToken,
  refreshToken
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  requireAuth,
  getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  requireAuth,
  validateProfileUpdate,
  updateProfile
);

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify email address with token
 * @access  Public
 */
router.get('/verify/:token',
  validateToken,
  verifyEmail
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password',
  passwordResetLimiter,
  validateEmail,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  passwordResetLimiter,
  validatePasswordReset,
  resetPassword
);

/**
 * @route   GET /api/auth/validate-token
 * @desc    Validate current token (health check for frontend)
 * @access  Private
 */
router.get('/validate-token',
  requireAuth,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          isVerified: req.user.isVerified
        },
        tokenExpiry: req.tokenPayload.exp
      }
    });
  }
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post('/resend-verification',
  requireAuth,
  async (req, res) => {
    try {
      // Check if user is already verified
      if (req.user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified',
          code: 'ALREADY_VERIFIED'
        });
      }

      // Generate new verification token
      const verificationToken = req.user.generateEmailVerificationToken();
      await req.user.save();

      // In production, send verification email here
      // await emailService.sendVerificationEmail(req.user.email, verificationToken);

      logger.auth('Verification email resent', req.user._id, req.user.email, req.ip, req.get('User-Agent'));

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
        ...(process.env.NODE_ENV === 'development' && { verificationToken })
      });

    } catch (error) {
      logger.error('Resend verification error:', {
        service: 'auth',
        error: error.message,
        userId: req.user._id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to resend verification email',
        code: 'RESEND_VERIFICATION_ERROR'
      });
    }
  }
);

/**
 * @route   GET /api/auth/session-info
 * @desc    Get current session information
 * @access  Private
 */
router.get('/session-info',
  requireAuth,
  (req, res) => {
    try {
      const sessionInfo = {
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          isVerified: req.user.isVerified,
          lastLogin: req.user.lastLogin,
          createdAt: req.user.createdAt
        },
        session: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          tokenIssued: new Date(req.tokenPayload.iat * 1000),
          tokenExpires: new Date(req.tokenPayload.exp * 1000)
        },
        apiUsage: req.user.apiUsage
      };

      res.status(200).json({
        success: true,
        message: 'Session information retrieved successfully',
        data: sessionInfo
      });

    } catch (error) {
      logger.error('Session info error:', {
        service: 'auth',
        error: error.message,
        userId: req.user._id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve session information',
        code: 'SESSION_INFO_ERROR'
      });
    }
  }
);

// Admin-only routes
/**
 * @route   GET /api/auth/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/users',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search, sort = '-createdAt' } = req.query;
      
      // Build query
      let query = {};
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        };
      }

      // Execute query with pagination
      const users = await User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('screens', 'name status');

      const total = await User.countDocuments(query);

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Get users error:', {
        service: 'auth',
        error: error.message,
        adminId: req.user._id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        code: 'GET_USERS_ERROR'
      });
    }
  }
);

/**
 * @route   GET /api/auth/stats
 * @desc    Get user statistics (admin only)
 * @access  Private/Admin
 */
router.get('/stats',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const stats = await User.getUserStats();
      
      // Additional stats
      const recentUsers = await User.find()
        .select('name email createdAt')
        .sort('-createdAt')
        .limit(5);

      res.status(200).json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: {
          ...stats,
          recentUsers
        }
      });

    } catch (error) {
      logger.error('Get user stats error:', {
        service: 'auth',
        error: error.message,
        adminId: req.user._id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user statistics',
        code: 'GET_STATS_ERROR'
      });
    }
  }
);

module.exports = router;