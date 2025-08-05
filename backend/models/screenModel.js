const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Screen model for digital signage display management
 * Handles screen registration, status tracking, playlist assignments, and real-time monitoring
 */

const screenSchema = new mongoose.Schema({
  // Basic screen information
  screenId: {
    type: String,
    required: [true, 'Screen ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [6, 'Screen ID must be at least 6 characters'],
    maxlength: [20, 'Screen ID cannot exceed 20 characters'],
    match: [
      /^[A-Z0-9\-_]+$/,
      'Screen ID can only contain uppercase letters, numbers, hyphens, and underscores'
    ]
  },

  name: {
    type: String,
    required: [true, 'Screen name is required'],
    trim: true,
    minlength: [2, 'Screen name must be at least 2 characters'],
    maxlength: [100, 'Screen name cannot exceed 100 characters']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Owner and permissions
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Screen owner is required'],
    index: true
  },

  // Location and physical properties
  location: {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
      maxlength: [200, 'Location name cannot exceed 200 characters']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    }
  },

  // Display specifications
  display: {
    resolution: {
      width: {
        type: Number,
        required: [true, 'Display width is required'],
        min: [640, 'Display width must be at least 640px']
      },
      height: {
        type: Number,
        required: [true, 'Display height is required'],
        min: [480, 'Display height must be at least 480px']
      }
    },
    diagonal: {
      type: Number,
      min: [10, 'Display diagonal must be at least 10 inches'],
      max: [200, 'Display diagonal cannot exceed 200 inches']
    },
    orientation: {
      type: String,
      enum: {
        values: ['landscape', 'portrait'],
        message: 'Orientation must be either landscape or portrait'
      },
      default: 'landscape'
    },
    brightness: {
      type: Number,
      min: [0, 'Brightness cannot be negative'],
      max: [100, 'Brightness cannot exceed 100%'],
      default: 100
    }
  },

  // Network and connection
  network: {
    ipAddress: {
      type: String,
      validate: {
        validator: function(ip) {
          if (!ip) return true; // Optional field
          return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
        },
        message: 'Invalid IP address format'
      }
    },
    macAddress: {
      type: String,
      validate: {
        validator: function(mac) {
          if (!mac) return true; // Optional field
          return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
        },
        message: 'Invalid MAC address format'
      }
    },
    connectionType: {
      type: String,
      enum: ['wifi', 'ethernet', 'cellular', 'unknown'],
      default: 'unknown'
    }
  },

  // Status and monitoring
  status: {
    type: String,
    enum: {
      values: ['online', 'offline', 'connecting', 'error', 'maintenance'],
      message: 'Invalid status value'
    },
    default: 'offline',
    index: true
  },

  lastSeen: {
    type: Date,
    default: Date.now,
    index: true
  },

  heartbeatInterval: {
    type: Number,
    default: 30,
    min: [10, 'Heartbeat interval must be at least 10 seconds'],
    max: [300, 'Heartbeat interval cannot exceed 5 minutes']
  },

  // Content management
  currentPlaylist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist'
  },

  playlistQueue: [{
    playlist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Playlist'
    },
    priority: {
      type: Number,
      default: 1,
      min: [1, 'Priority must be at least 1'],
      max: [10, 'Priority cannot exceed 10']
    },
    scheduledStart: Date,
    scheduledEnd: Date
  }],

  // Device information
  device: {
    type: {
      type: String,
      enum: ['raspberry-pi', 'android', 'windows', 'linux', 'smart-tv', 'other'],
      default: 'other'
    },
    model: {
      type: String,
      trim: true,
      maxlength: [100, 'Device model cannot exceed 100 characters']
    },
    os: {
      type: String,
      trim: true,
      maxlength: [50, 'OS cannot exceed 50 characters']
    },
    version: {
      type: String,
      trim: true,
      maxlength: [20, 'Version cannot exceed 20 characters']
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: [500, 'User agent cannot exceed 500 characters']
    }
  },

  // Performance metrics
  performance: {
    cpuUsage: {
      type: Number,
      min: [0, 'CPU usage cannot be negative'],
      max: [100, 'CPU usage cannot exceed 100%']
    },
    memoryUsage: {
      type: Number,
      min: [0, 'Memory usage cannot be negative'],
      max: [100, 'Memory usage cannot exceed 100%']
    },
    storageUsage: {
      type: Number,
      min: [0, 'Storage usage cannot be negative'],
      max: [100, 'Storage usage cannot exceed 100%']
    },
    temperature: {
      type: Number,
      min: [-50, 'Temperature cannot be below -50°C'],
      max: [100, 'Temperature cannot exceed 100°C']
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Settings and configuration
  settings: {
    autoRestart: {
      type: Boolean,
      default: true
    },
    maintenanceWindow: {
      start: {
        type: String,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
      },
      end: {
        type: String,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
      },
      timezone: {
        type: String,
        default: 'UTC'
      }
    },
    volume: {
      type: Number,
      min: [0, 'Volume cannot be negative'],
      max: [100, 'Volume cannot exceed 100%'],
      default: 50
    },
    autoUpdate: {
      type: Boolean,
      default: true
    }
  },

  // Activity tracking
  activity: {
    totalUptime: {
      type: Number,
      default: 0,
      min: [0, 'Total uptime cannot be negative']
    },
    playlistChanges: {
      type: Number,
      default: 0,
      min: [0, 'Playlist changes cannot be negative']
    },
    lastPlaylistChange: Date,
    errorCount: {
      type: Number,
      default: 0,
      min: [0, 'Error count cannot be negative']
    },
    lastError: {
      message: String,
      timestamp: Date,
      code: String
    }
  },

  // Access control
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  accessKey: {
    type: String,
    required: [true, 'Access key is required'],
    unique: true,
    select: false // Don't include in queries by default
  },

  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
    validate: {
      validator: function(tag) {
        return /^[a-zA-Z0-9\s\-_]+$/.test(tag);
      },
      message: 'Tags can only contain letters, numbers, spaces, hyphens, and underscores'
    }
  }],

  // Notification preferences
  notifications: {
    offline: {
      type: Boolean,
      default: true
    },
    errors: {
      type: Boolean,
      default: true  
    },
    maintenance: {
      type: Boolean,
      default: false
    },
    performance: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
screenSchema.index({ owner: 1 });
screenSchema.index({ status: 1 });
screenSchema.index({ owner: 1, status: 1 });
screenSchema.index({ owner: 1, isActive: 1 });
screenSchema.index({ screenId: 1 }, { unique: true });
screenSchema.index({ accessKey: 1 }, { unique: true });
screenSchema.index({ lastSeen: -1 });
screenSchema.index({ createdAt: -1 });
screenSchema.index({ tags: 1 });
screenSchema.index({ 'location.name': 'text', name: 'text', description: 'text' });

// Compound indexes for common queries
screenSchema.index({ owner: 1, isActive: 1, status: 1 });
screenSchema.index({ currentPlaylist: 1, status: 1 });

// Virtual properties
screenSchema.virtual('isOnline').get(function() {
  if (this.status !== 'online') return false;
  
  const now = new Date();
  const lastSeenThreshold = new Date(now.getTime() - (this.heartbeatInterval * 2 * 1000));
  return this.lastSeen > lastSeenThreshold;
});

screenSchema.virtual('uptime').get(function() {
  if (this.status !== 'online' || !this.lastSeen) return 0;
  
  const now = new Date();
  return Math.floor((now - this.createdAt) / 1000); // seconds
});

screenSchema.virtual('resolution').get(function() {
  if (!this.display || !this.display.resolution) return null;
  return `${this.display.resolution.width}x${this.display.resolution.height}`;
});

screenSchema.virtual('aspectRatio').get(function() {
  if (!this.display || !this.display.resolution) return null;
  const { width, height } = this.display.resolution;
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
});

screenSchema.virtual('isHealthy').get(function() {
  if (!this.isOnline) return false;
  
  const performance = this.performance;
  if (!performance) return true;
  
  // Consider screen healthy if all metrics are within acceptable ranges
  const cpuOk = !performance.cpuUsage || performance.cpuUsage < 80;
  const memoryOk = !performance.memoryUsage || performance.memoryUsage < 85;
  const storageOk = !performance.storageUsage || performance.storageUsage < 90;
  const temperatureOk = !performance.temperature || performance.temperature < 70;
  
  return cpuOk && memoryOk && storageOk && temperatureOk;
});

// Pre-save hooks
screenSchema.pre('save', function(next) {
  // Generate access key if not provided
  if (this.isNew && !this.accessKey) {
    this.accessKey = crypto.randomBytes(32).toString('hex');
  }

  // Auto-generate screen ID if not provided
  if (this.isNew && !this.screenId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.screenId = `SCR-${timestamp}-${randomPart}`;
  }

  // Update activity tracking
  if (this.isModified('currentPlaylist')) {
    this.activity.playlistChanges += 1;
    this.activity.lastPlaylistChange = new Date();
  }

  // Validate coordinates if provided
  if (this.location && this.location.coordinates) {
    const { latitude, longitude } = this.location.coordinates;
    if ((latitude && !longitude) || (!latitude && longitude)) {
      return next(new Error('Both latitude and longitude must be provided together'));
    }
  }

  next();
});

// Instance methods
screenSchema.methods.updateStatus = async function(status, message) {
  this.status = status;
  this.lastSeen = new Date();
  
  if (status === 'error' && message) {
    this.activity.errorCount += 1;
    this.activity.lastError = {
      message,
      timestamp: new Date(),
      code: 'SCREEN_ERROR'
    };
  }
  
  await this.save();
};

screenSchema.methods.updatePerformance = async function(metrics) {
  const { cpuUsage, memoryUsage, storageUsage, temperature } = metrics;
  
  this.performance = {
    ...this.performance,
    cpuUsage,
    memoryUsage,
    storageUsage,
    temperature,
    lastUpdated: new Date()
  };
  
  await this.save();
};

screenSchema.methods.assignPlaylist = async function(playlistId, priority = 1) {
  // Remove existing queue item for this playlist
  this.playlistQueue = this.playlistQueue.filter(
    item => item.playlist.toString() !== playlistId.toString()
  );
  
  // Add to queue
  this.playlistQueue.push({
    playlist: playlistId,
    priority,
    scheduledStart: new Date()
  });
  
  // Sort by priority (higher number = higher priority)
  this.playlistQueue.sort((a, b) => b.priority - a.priority);
  
  // Set as current playlist if it's the highest priority
  if (this.playlistQueue.length > 0 && this.playlistQueue[0].priority >= priority) {
    this.currentPlaylist = playlistId;
  }
  
  await this.save();
};

screenSchema.methods.removePlaylist = async function(playlistId) {
  // Remove from queue
  this.playlistQueue = this.playlistQueue.filter(
    item => item.playlist.toString() !== playlistId.toString()
  );
  
  // Clear current playlist if it matches
  if (this.currentPlaylist && this.currentPlaylist.toString() === playlistId.toString()) {
    this.currentPlaylist = this.playlistQueue.length > 0 ? this.playlistQueue[0].playlist : null;
  }
  
  await this.save();
};

screenSchema.methods.heartbeat = async function() {
  this.lastSeen = new Date();
  
  // Update uptime if screen is online
  if (this.status === 'online') {
    const timeSinceLastSeen = Date.now() - this.lastSeen.getTime();
    this.activity.totalUptime += Math.floor(timeSinceLastSeen / 1000);
  }
  
  await this.save();
};

screenSchema.methods.generateNewAccessKey = function() {
  this.accessKey = crypto.randomBytes(32).toString('hex');
  return this.accessKey;
};

// Static methods
screenSchema.statics.findUserScreens = function(userId, filters = {}) {
  const query = { 
    owner: userId, 
    isActive: true 
  };
  
  // Apply filters
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  if (filters.location) {
    query['location.name'] = { $regex: filters.location, $options: 'i' };
  }
  
  return this.find(query);
};

screenSchema.statics.findOnlineScreens = function(userId) {
  const heartbeatTimeout = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes
  
  return this.find({
    owner: userId,
    isActive: true,
    status: 'online',
    lastSeen: { $gte: heartbeatTimeout }
  });
};

screenSchema.statics.findOfflineScreens = function(userId) {
  const heartbeatTimeout = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes
  
  return this.find({
    owner: userId,
    isActive: true,
    $or: [
      { status: { $ne: 'online' } },
      { lastSeen: { $lt: heartbeatTimeout } }
    ]
  });
};

screenSchema.statics.getUserScreenStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalScreens: { $sum: 1 },
        onlineScreens: {
          $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
        },
        offlineScreens: {
          $sum: { $cond: [{ $ne: ['$status', 'online'] }, 1, 0] }
        },
        errorScreens: {
          $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
        },
        totalUptime: { $sum: '$activity.totalUptime' },
        avgPlaylistChanges: { $avg: '$activity.playlistChanges' }
      }
    }
  ]);

  return stats[0] || {
    totalScreens: 0,
    onlineScreens: 0,
    offlineScreens: 0,
    errorScreens: 0,
    totalUptime: 0,
    avgPlaylistChanges: 0
  };
};

screenSchema.statics.findByAccessKey = function(accessKey) {
  return this.findOne({ accessKey, isActive: true }).select('+accessKey');
};

// Remove sensitive fields when converting to JSON
screenSchema.methods.toJSON = function() {
  const screenObject = this.toObject();
  
  // Remove sensitive fields
  delete screenObject.accessKey;
  
  // Add virtual properties
  screenObject.isOnline = this.isOnline;
  screenObject.uptime = this.uptime;
  screenObject.resolution = this.resolution;
  screenObject.aspectRatio = this.aspectRatio;
  screenObject.isHealthy = this.isHealthy;
  
  return screenObject;
};

module.exports = mongoose.model('Screen', screenSchema);