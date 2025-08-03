const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Media model for managing uploaded files (images and videos)
 * Handles media storage, metadata, playback properties, and user associations
 */

const mediaSchema = new mongoose.Schema({
  // Basic file information
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true,
    maxlength: [255, 'Original file name cannot exceed 255 characters']
  },

  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true,
    unique: true,
    maxlength: [255, 'Filename cannot exceed 255 characters']
  },

  // Cloudinary integration data
  cloudinaryId: {
    type: String,
    required: [true, 'Cloudinary ID is required'],
    unique: true,
    trim: true
  },

  url: {
    type: String,
    required: [true, 'Media URL is required'],
    trim: true,
    match: [
      /^https?:\/\/.+/,
      'Please provide a valid URL'
    ]
  },

  secureUrl: {
    type: String,
    required: [true, 'Secure URL is required'],
    trim: true,
    match: [
      /^https:\/\/.+/,
      'Please provide a valid HTTPS URL'
    ]
  },

  // Media properties
  type: {
    type: String,
    required: [true, 'Media type is required'],
    enum: {
      values: ['image', 'video'],
      message: 'Media type must be either image or video'
    }
  },

  format: {
    type: String,
    required: [true, 'Media format is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(format) {
        const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
        
        if (this.type === 'image') {
          return imageFormats.includes(format);
        } else if (this.type === 'video') {
          return videoFormats.includes(format);
        }
        return false;
      },
      message: 'Invalid format for the specified media type'
    }
  },

  width: {
    type: Number,
    required: [true, 'Media width is required'],
    min: [1, 'Width must be greater than 0']
  },

  height: {
    type: Number,
    required: [true, 'Media height is required'],
    min: [1, 'Height must be greater than 0']
  },

  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0'],
    max: [52428800, 'File size cannot exceed 50MB'] // 50MB in bytes
  },

  // Playback properties
  duration: {
    type: Number,
    required: function() {
      return this.type === 'image';
    },
    default: function() {
      return this.type === 'image' ? 10 : undefined;
    },
    min: [1, 'Duration must be at least 1 second'],
    max: [300, 'Duration cannot exceed 5 minutes'],
    validate: {
      validator: function(duration) {
        // Duration is only for images
        if (this.type === 'image') {
          return duration && duration >= 1 && duration <= 300;
        }
        return duration === undefined || duration === null;
      },
      message: 'Duration is only applicable for images and must be between 1-300 seconds'
    }
  },

  videoDuration: {
    type: Number,
    required: function() {
      return this.type === 'video';
    },
    min: [0.1, 'Video duration must be at least 0.1 seconds'],
    max: [7200, 'Video duration cannot exceed 2 hours'],
    validate: {
      validator: function(videoDuration) {
        // Video duration is only for videos
        if (this.type === 'video') {
          return videoDuration && videoDuration >= 0.1 && videoDuration <= 7200;
        }
        return videoDuration === undefined || videoDuration === null;
      },
      message: 'Video duration is only applicable for videos and must be between 0.1-7200 seconds'
    }
  },

  // Metadata and associations
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Media owner is required'],
    index: true
  },

  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
    validate: {
      validator: function(tag) {
        return /^[a-zA-Z0-9\s-_]+$/.test(tag);
      },
      message: 'Tags can only contain letters, numbers, spaces, hyphens, and underscores'
    }
  }],

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },

  lastUsed: {
    type: Date
  },

  // Status and visibility
  isActive: {
    type: Boolean,
    default: true
  },

  isPublic: {
    type: Boolean,
    default: false
  },

  // Quality metrics (from Cloudinary)
  quality: {
    type: String,
    enum: ['auto', 'low', 'medium', 'high', 'best'],
    default: 'auto'
  },

  // Additional Cloudinary metadata
  cloudinaryMetadata: {
    bytes: Number,
    etag: String,
    placeholder: Boolean,
    colors: [{
      color: String,
      percentage: Number
    }],
    predominant: {
      background: String,
      foreground: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
mediaSchema.index({ owner: 1 });
mediaSchema.index({ type: 1 });
mediaSchema.index({ owner: 1, type: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ isActive: 1 });
mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ filename: 1 }, { unique: true });
mediaSchema.index({ cloudinaryId: 1 }, { unique: true });
mediaSchema.index({ usageCount: -1 });

// Compound indexes for common queries
mediaSchema.index({ owner: 1, isActive: 1, type: 1 });
mediaSchema.index({ owner: 1, createdAt: -1 });

// Virtual properties
mediaSchema.virtual('aspectRatio').get(function() {
  return this.width && this.height ? (this.width / this.height).toFixed(2) : null;
});

mediaSchema.virtual('isLandscape').get(function() {
  return this.width > this.height;
});

mediaSchema.virtual('isPortrait').get(function() {
  return this.height > this.width;
});

mediaSchema.virtual('isSquare').get(function() {
  return this.width === this.height;
});

mediaSchema.virtual('totalDuration').get(function() {
  return this.type === 'image' ? this.duration : this.videoDuration;
});

// Pre-save hooks for data validation
mediaSchema.pre('save', function(next) {
  // Ensure filename uniqueness with user prefix if not already set
  if (this.isNew && !this.filename.includes('_')) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    this.filename = `${this.owner}_${timestamp}_${randomString}_${this.originalName}`;
  }

  // Validate file size based on type
  if (this.type === 'image' && this.fileSize > 10485760) { // 10MB for images
    return next(new Error('Image file size cannot exceed 10MB'));
  }
  
  if (this.type === 'video' && this.fileSize > 52428800) { // 50MB for videos
    return next(new Error('Video file size cannot exceed 50MB'));
  }

  // Auto-generate description if not provided
  if (!this.description) {
    this.description = `${this.type} file: ${this.originalName}`;
  }

  next();
});

// Instance methods for formatting
mediaSchema.methods.formatFileSize = function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

mediaSchema.methods.formatDuration = function() {
  const seconds = this.totalDuration;
  if (!seconds) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

mediaSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  await this.save();
};

mediaSchema.methods.updateTags = function(newTags) {
  // Remove duplicates and validate tags
  const validTags = newTags
    .filter(tag => tag && tag.trim())
    .map(tag => tag.trim().toLowerCase())
    .filter((tag, index, arr) => arr.indexOf(tag) === index)
    .slice(0, 10); // Limit to 10 tags
  
  this.tags = validTags;
  return this;
};

// Static methods for querying user media
mediaSchema.statics.findUserMedia = function(userId, filters = {}) {
  const query = { owner: userId, isActive: true };
  
  // Apply filters
  if (filters.type) {
    query.type = filters.type;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.search) {
    query.$or = [
      { originalName: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { tags: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  return this.find(query);
};

mediaSchema.statics.getUserMediaStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        imageCount: {
          $sum: { $cond: [{ $eq: ['$type', 'image'] }, 1, 0] }
        },
        videoCount: {
          $sum: { $cond: [{ $eq: ['$type', 'video'] }, 1, 0] }
        },
        totalUsage: { $sum: '$usageCount' },
        avgFileSize: { $avg: '$fileSize' }
      }
    }
  ]);

  return stats[0] || {
    totalFiles: 0,
    totalSize: 0,
    imageCount: 0,
    videoCount: 0,
    totalUsage: 0,
    avgFileSize: 0
  };
};

mediaSchema.statics.findRecentMedia = function(userId, limit = 10) {
  return this.find({ 
    owner: userId, 
    isActive: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('owner', 'name email');
};

mediaSchema.statics.findPopularMedia = function(userId, limit = 10) {
  return this.find({ 
    owner: userId, 
    isActive: true 
  })
  .sort({ usageCount: -1, createdAt: -1 })
  .limit(limit)
  .populate('owner', 'name email');
};

mediaSchema.statics.findByCloudinaryId = function(cloudinaryId) {
  return this.findOne({ cloudinaryId, isActive: true });
};

mediaSchema.statics.findDuplicates = function(userId) {
  return this.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: '$cloudinaryId',
        count: { $sum: 1 },
        files: { $push: '$$ROOT' }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);
};

// Remove sensitive fields when converting to JSON
mediaSchema.methods.toJSON = function() {
  const mediaObject = this.toObject();
  
  // Add formatted values
  mediaObject.formattedFileSize = this.formatFileSize();
  mediaObject.formattedDuration = this.formatDuration();
  
  return mediaObject;
};

module.exports = mongoose.model('Media', mediaSchema);