const { body, param, query } = require('express-validator');

/**
 * Input validation schemas using express-validator
 * Provides comprehensive validation for all authentication endpoints
 */

/**
 * User registration validation
 */
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter and one number'),

  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
];

/**
 * User login validation
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password cannot exceed 128 characters'),

  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean value')
];

/**
 * Email validation (for forgot password)
 */
const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters')
];

/**
 * Password reset validation
 */
const validatePasswordReset = [
  body('token')
    .isLength({ min: 1 })
    .withMessage('Reset token is required')
    .matches(/^[a-f0-9]{64}$/)
    .withMessage('Invalid reset token format'),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter and one number')
];

/**
 * Profile update validation
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),

  body('preferences.notifications')
    .optional()
    .isObject()
    .withMessage('Notifications preferences must be an object'),

  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be a boolean'),

  body('preferences.notifications.screenStatus')
    .optional()
    .isBoolean()
    .withMessage('Screen status notification preference must be a boolean'),

  body('preferences.notifications.playlistUpdates')
    .optional()
    .isBoolean()
    .withMessage('Playlist updates notification preference must be a boolean'),

  body('preferences.dashboard')
    .optional()
    .isObject()
    .withMessage('Dashboard preferences must be an object'),

  body('preferences.dashboard.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),

  body('preferences.dashboard.defaultView')
    .optional()
    .isIn(['screens', 'media', 'playlists'])
    .withMessage('Default view must be screens, media, or playlists')
];

/**
 * Token parameter validation
 */
const validateToken = [
  param('token')
    .isLength({ min: 1 })
    .withMessage('Token is required')
    .matches(/^[a-f0-9]{64}$/)
    .withMessage('Invalid token format')
];

/**
 * Refresh token validation
 */
const validateRefreshToken = [
  body('refreshToken')
    .optional()
    .isJWT()
    .withMessage('Invalid refresh token format')
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (field = 'id') => [
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`)
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a positive integer between 1 and 1000'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer between 1 and 100'),

  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'name', '-name', 'email', '-email'])
    .withMessage('Invalid sort field')
];

/**
 * Search validation
 */
const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s@._-]+$/)
    .withMessage('Search query contains invalid characters')
];

/**
 * Date range validation
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

/**
 * File upload validation
 */
const validateFileUpload = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

/**
 * Screen validation
 */
const validateScreen = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Screen name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage('Screen name can only contain letters, numbers, spaces, underscores, and hyphens'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('resolution')
    .optional()
    .isObject()
    .withMessage('Resolution must be an object'),

  body('resolution.width')
    .optional()
    .isInt({ min: 1, max: 7680 })
    .withMessage('Width must be between 1 and 7680 pixels'),

  body('resolution.height')
    .optional()
    .isInt({ min: 1, max: 4320 })
    .withMessage('Height must be between 1 and 4320 pixels')
];

/**
 * Playlist validation
 */
const validatePlaylist = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Playlist name must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('schedule')
    .optional()
    .isObject()
    .withMessage('Schedule must be an object'),

  body('schedule.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('schedule.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  body('schedule.days')
    .optional()
    .isArray()
    .withMessage('Days must be an array'),

  body('schedule.days.*')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day of week'),

  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),

  body('items.*.mediaId')
    .optional()
    .isMongoId()
    .withMessage('Invalid media ID'),

  body('items.*.duration')
    .optional()
    .isInt({ min: 1, max: 3600 })
    .withMessage('Duration must be between 1 and 3600 seconds'),

  body('items.*.order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
];

/**
 * Admin user management validation
 */
const validateUserManagement = [
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean'),

  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('Verified status must be a boolean')
];

/**
 * Password change validation (for authenticated users)
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    .custom((newPassword, { req }) => {
      if (newPassword === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmPassword')
    .custom((confirmPassword, { req }) => {
      if (confirmPassword !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

module.exports = {
  validateRegister,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateProfileUpdate,
  validateToken,
  validateRefreshToken,
  validateObjectId,
  validatePagination,
  validateSearch,
  validateDateRange,
  validateFileUpload,
  validateScreen,
  validatePlaylist,
  validateUserManagement,
  validatePasswordChange
};