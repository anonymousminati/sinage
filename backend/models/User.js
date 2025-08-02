const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * User model for authentication and authorization
 * Handles user registration, login, password reset, and account management
 */

const userSchema = new mongoose.Schema({
  // Basic user information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },

  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  // User role and permissions
  role: {
    type: String,
    enum: {
      values: ['admin', 'user'],
      message: 'Role must be either admin or user'
    },
    default: 'user'
  },

  // Account verification
  isVerified: {
    type: Boolean,
    default: false
  },

  emailVerificationToken: {
    type: String,
    select: false
  },

  emailVerificationExpires: {
    type: Date,
    select: false
  },

  // Associated screens
  screens: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Screen'
  }],

  // Password reset functionality
  resetPasswordToken: {
    type: String,
    select: false
  },

  resetPasswordExpires: {
    type: Date,
    select: false
  },

  // Security features
  lastLogin: {
    type: Date
  },

  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },

  lockUntil: {
    type: Date,
    select: false
  },

  // Login history
  loginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    success: Boolean
  }],

  // User preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      screenStatus: {
        type: Boolean,
        default: true
      },
      playlistUpdates: {
        type: Boolean,
        default: true
      }
    },
    dashboard: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      },
      defaultView: {
        type: String,
        enum: ['screens', 'media', 'playlists'],
        default: 'screens'
      }
    }
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },

  // API usage tracking
  apiUsage: {
    requestCount: {
      type: Number,
      default: 0
    },
    lastReset: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with salt rounds from environment
    const saltRounds = parseInt(process.env.SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return token;
};

// Instance method to handle failed login attempts
userSchema.methods.handleFailedLogin = async function() {
  // Increment login attempts
  this.loginAttempts += 1;

  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
  }

  await this.save();
};

// Instance method to handle successful login
userSchema.methods.handleSuccessfulLogin = async function(ip, userAgent) {
  // Reset login attempts and lock
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();

  // Add to login history (keep last 10 entries)
  this.loginHistory.unshift({
    ip,
    userAgent,
    timestamp: new Date(),
    success: true
  });

  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(0, 10);
  }

  await this.save();
};

// Instance method to update API usage
userSchema.methods.updateApiUsage = async function() {
  const now = new Date();
  const lastReset = new Date(this.apiUsage.lastReset);
  
  // Reset counter if it's a new day
  if (now.toDateString() !== lastReset.toDateString()) {
    this.apiUsage.requestCount = 1;
    this.apiUsage.lastReset = now;
  } else {
    this.apiUsage.requestCount += 1;
  }

  await this.save();
};

// Static method to find user by email verification token
userSchema.statics.findByEmailVerificationToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
};

// Static method to find user by password reset token
userSchema.statics.findByPasswordResetToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
        },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        adminUsers: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    verifiedUsers: 0,
    activeUsers: 0,
    adminUsers: 0
  };
};

// Remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  
  return userObject;
};

module.exports = mongoose.model('User', userSchema);