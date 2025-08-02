const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken, generateSecureToken, hashToken } = require('../utils/tokenUtils');
const { validationResult } = require('express-validator');
const logger = require('../config/logger');
const crypto = require('crypto');

/**
 * Authentication Controllers
 * Handles user registration, login, logout, password reset, and account verification
 */

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.security('Registration attempt with existing email', req.ip, {
        email,
        userAgent: req.get('User-Agent')
      });

      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Create new user
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'user'
    };

    const user = new User(userData);

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();

    // Save user
    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();

    // Log successful registration
    logger.auth('User registered', user._id, user.email, req.ip, req.get('User-Agent'));

    // In production, you would send verification email here
    // await emailService.sendVerificationEmail(user.email, verificationToken);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email address.',
      data: {
        user: userResponse,
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined
      }
    });

  } catch (error) {
    logger.error('Registration error:', {
      service: 'auth',
      error: error.message,
      email: req.body?.email,
      ip: req.ip
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      code: 'REGISTRATION_ERROR'
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, rememberMe } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +loginAttempts +lockUntil');

    if (!user) {
      logger.security('Login attempt with non-existent email', ip, {
        email,
        userAgent
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logger.security('Login attempt on locked account', ip, {
        userId: user._id,
        email: user.email,
        lockUntil: user.lockUntil
      });

      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logger.security('Login attempt on inactive account', ip, {
        userId: user._id,
        email: user.email
      });

      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Handle failed login
      await user.handleFailedLogin();

      logger.security('Failed login attempt', ip, {
        userId: user._id,
        email: user.email,
        attempts: user.loginAttempts + 1,
        userAgent
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Handle successful login
    await user.handleSuccessfulLogin(ip, userAgent);

    // Generate token pair
    const tokens = generateTokenPair(user);

    // Set token expiration based on rememberMe
    const accessTokenExpiration = rememberMe ? 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days
      new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Set HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      expires: accessTokenExpiration
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      expires: tokens.refreshTokenExpiresAt
    });

    // Remove sensitive data from user object
    const userResponse = user.toJSON();

    // Log successful login
    logger.auth('User logged in', user._id, user.email, ip, userAgent);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        tokens,
        expiresAt: accessTokenExpiration
      }
    });

  } catch (error) {
    logger.error('Login error:', {
      service: 'auth',
      error: error.message,
      email: req.body?.email,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res) => {
  try {
    // Clear cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    // Log logout
    if (req.user) {
      logger.auth('User logged out', req.user._id, req.user.email, req.ip, req.get('User-Agent'));
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', {
      service: 'auth',
      error: error.message,
      userId: req.user?._id
    });

    res.status(500).json({
      success: false,
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
const refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie or body
    let refreshTokenValue = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshTokenValue) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshTokenValue);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);

    // Set new cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      expires: tokens.accessTokenExpiresAt
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      expires: tokens.refreshTokenExpiresAt
    });

    // Log token refresh
    logger.auth('Token refreshed', user._id, user.email, req.ip, req.get('User-Agent'));

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens,
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.security('Refresh token verification failed', req.ip, {
      error: error.message,
      userAgent: req.get('User-Agent')
    });

    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      code: 'REFRESH_TOKEN_INVALID'
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
const getProfile = async (req, res) => {
  try {
    // Use the same approach as updateProfile to find the user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {}, // No updates, just query
      { new: true, runValidators: false }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.error('Get profile error:', {
      service: 'auth',
      error: error.message,
      userId: req.user?._id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      code: 'PROFILE_ERROR'
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, preferences } = req.body;
    const updateData = {};

    // Update allowed fields
    if (name) updateData.name = name.trim();
    if (preferences) updateData.preferences = preferences;

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Log profile update
    logger.auth('Profile updated', user._id, user.email, req.ip, req.get('User-Agent'));

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.error('Update profile error:', {
      service: 'auth',
      error: error.message,
      userId: req.user._id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
};

/**
 * Verify email address
 * @route GET /api/auth/verify/:token
 * @access Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by verification token
    const user = await User.findByEmailVerificationToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        code: 'INVALID_VERIFICATION_TOKEN'
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Log email verification
    logger.auth('Email verified', user._id, user.email, req.ip, req.get('User-Agent'));

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.error('Email verification error:', {
      service: 'auth',
      error: error.message,
      token: req.params.token
    });

    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    if (!user) {
      logger.security('Password reset attempt for non-existent email', req.ip, {
        email,
        userAgent: req.get('User-Agent')
      });
      return res.status(200).json(successResponse);
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // In production, send email here
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    // Log password reset request
    logger.auth('Password reset requested', user._id, user.email, req.ip, req.get('User-Agent'));

    res.status(200).json({
      ...successResponse,
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    logger.error('Forgot password error:', {
      service: 'auth',
      error: error.message,
      email: req.body?.email
    });

    res.status(500).json({
      success: false,
      message: 'Password reset request failed',
      code: 'FORGOT_PASSWORD_ERROR'
    });
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Find user by reset token
    const user = await User.findByPasswordResetToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Reset login attempts and unlock account
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    // Log password reset
    logger.auth('Password reset completed', user._id, user.email, req.ip, req.get('User-Agent'));

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Reset password error:', {
      service: 'auth',
      error: error.message,
      hasToken: !!req.body?.token
    });

    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      code: 'RESET_PASSWORD_ERROR'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  verifyEmail,
  forgotPassword,
  resetPassword
};