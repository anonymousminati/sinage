const mongoose = require('mongoose');

/**
 * Playlist model for managing digital signage content playlists
 * Handles playlist creation, media items ordering, screen assignments, and analytics
 */

// PlaylistItem subdocument schema
const playlistItemSchema = new mongoose.Schema({
  mediaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    required: [true, 'Media ID is required for playlist item'],
    index: true
  },

  order: {
    type: Number,
    required: [true, 'Order is required for playlist item'],
    min: [0, 'Order must be non-negative']
  },

  // Custom duration override for this specific item in this playlist
  duration: {
    type: Number,
    min: [1, 'Custom duration must be at least 1 second'],
    max: [7200, 'Custom duration cannot exceed 2 hours'],
    validate: {
      validator: function(duration) {
        // Duration can be null/undefined (use media default) or a valid number
        return duration === null || duration === undefined || (duration >= 1 && duration <= 7200);
      },
      message: 'Custom duration must be between 1-7200 seconds or null to use media default'
    }
  },

  // Transition effects for this item
  transitions: {
    type: {
      type: String,
      enum: {
        values: ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out'],
        message: 'Invalid transition type'
      },
      default: 'none'
    },
    duration: {
      type: Number,
      min: [0.1, 'Transition duration must be at least 0.1 seconds'],
      max: [5, 'Transition duration cannot exceed 5 seconds'],
      default: 0.5
    }
  },

  // Conditional display rules
  conditions: [{
    type: {
      type: String,
      enum: {
        values: ['time-range', 'date-range', 'day-of-week', 'weather', 'custom'],
        message: 'Invalid condition type'
      }
    },
    operator: {
      type: String,
      enum: {
        values: ['equals', 'not-equals', 'greater-than', 'less-than', 'between', 'in', 'not-in'],
        message: 'Invalid condition operator'
      }
    },
    value: {
      type: String,
      required: [true, 'Condition value is required'],
      trim: true,
      maxlength: [100, 'Condition value cannot exceed 100 characters']
    }
  }],

  // Item-specific metadata
  metadata: {
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Notes cannot exceed 200 characters']
    }
  }
}, {
  _id: true,
  timestamps: false
});

// Main Playlist schema
const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
    minlength: [2, 'Playlist name must be at least 2 characters'],
    maxlength: [100, 'Playlist name cannot exceed 100 characters'],
    validate: {
      validator: function(name) {
        return /^[a-zA-Z0-9\s\-_\.]+$/.test(name);
      },
      message: 'Playlist name can only contain letters, numbers, spaces, hyphens, underscores, and dots'
    }
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Playlist visibility and status
  isActive: {
    type: Boolean,
    default: true
  },

  isPublic: {
    type: Boolean,
    default: false
  },

  // Owner and permissions
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Playlist owner is required'],
    index: true
  },

  // Collaborative editing permissions
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: {
        values: ['view', 'edit', 'admin'],
        message: 'Invalid permission level'
      },
      default: 'view'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Playlist content
  items: [playlistItemSchema],

  // Calculated fields
  totalDuration: {
    type: Number,
    default: 0,
    min: [0, 'Total duration cannot be negative']
  },

  totalItems: {
    type: Number,
    default: 0,
    min: [0, 'Total items cannot be negative']
  },

  // Screen assignments
  assignedScreens: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Screen'
  }],

  // Scheduling configuration
  schedule: {
    startDate: {
      type: Date,
      validate: {
        validator: function(startDate) {
          return !startDate || !this.schedule.endDate || startDate <= this.schedule.endDate;
        },
        message: 'Start date must be before or equal to end date'
      }
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(endDate) {
          return !endDate || !this.schedule.startDate || endDate >= this.schedule.startDate;
        },
        message: 'End date must be after or equal to start date'
      }
    },
    timeSlots: [{
      startTime: {
        type: String,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
        required: [true, 'Start time is required for time slot']
      },
      endTime: {
        type: String,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
        required: [true, 'End time is required for time slot'],
        validate: {
          validator: function(endTime) {
            if (!this.startTime) return true;
            const [startHour, startMin] = this.startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            return endMinutes > startMinutes;
          },
          message: 'End time must be after start time'
        }
      }
    }],
    daysOfWeek: [{
      type: Number,
      min: [0, 'Day of week must be between 0-6 (Sunday=0)'],
      max: [6, 'Day of week must be between 0-6 (Sunday=0)']
    }],
    isRecurring: {
      type: Boolean,
      default: false
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    }
  },

  // Analytics and usage tracking
  analytics: {
    totalPlays: {
      type: Number,
      default: 0,
      min: [0, 'Total plays cannot be negative']
    },
    lastPlayed: {
      type: Date
    },
    averagePlayDuration: {
      type: Number,
      default: 0,
      min: [0, 'Average play duration cannot be negative']
    },
    playHistory: [{
      screenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Screen'
      },
      playedAt: {
        type: Date,
        default: Date.now
      },
      duration: Number,
      completionRate: {
        type: Number,
        min: [0, 'Completion rate cannot be negative'],
        max: [1, 'Completion rate cannot exceed 100%']
      }
    }],
    popularItems: [{
      itemId: mongoose.Schema.Types.ObjectId,
      playCount: {
        type: Number,
        default: 0
      },
      avgDuration: {
        type: Number,
        default: 0
      }
    }]
  },

  // Playlist settings
  settings: {
    shuffle: {
      type: Boolean,
      default: false
    },
    loop: {
      type: Boolean,
      default: true
    },
    autoAdvance: {
      type: Boolean,
      default: true
    },
    pauseBetweenItems: {
      type: Number,
      default: 0,
      min: [0, 'Pause between items cannot be negative'],
      max: [30, 'Pause between items cannot exceed 30 seconds']
    }
  },

  // Version control for playlist updates
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },

  lastModified: {
    type: Date,
    default: Date.now
  },

  // Tags for categorization and search
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
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
playlistSchema.index({ owner: 1 });
playlistSchema.index({ isActive: 1 });
playlistSchema.index({ owner: 1, isActive: 1 });
playlistSchema.index({ assignedScreens: 1 });
playlistSchema.index({ tags: 1 });
playlistSchema.index({ createdAt: -1 });
playlistSchema.index({ lastModified: -1 });
playlistSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound indexes for common queries
playlistSchema.index({ owner: 1, isActive: 1, createdAt: -1 });
playlistSchema.index({ assignedScreens: 1, isActive: 1 });
playlistSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });

// Virtual properties
playlistSchema.virtual('itemCount').get(function() {
  return this.items ? this.items.length : 0;
});

playlistSchema.virtual('averageItemDuration').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  return this.totalDuration / this.items.length;
});

playlistSchema.virtual('isScheduled').get(function() {
  return !!(this.schedule && (this.schedule.startDate || this.schedule.timeSlots.length > 0));
});

playlistSchema.virtual('isCurrentlyActive').get(function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  const schedule = this.schedule;
  
  // Check date range
  if (schedule.startDate && now < schedule.startDate) return false;
  if (schedule.endDate && now > schedule.endDate) return false;
  
  // Check day of week
  if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
    const currentDay = now.getDay();
    if (!schedule.daysOfWeek.includes(currentDay)) return false;
  }
  
  // Check time slots
  if (schedule.timeSlots && schedule.timeSlots.length > 0) {
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const isInTimeSlot = schedule.timeSlots.some(slot => {
      return currentTime >= slot.startTime && currentTime <= slot.endTime;
    });
    if (!isInTimeSlot) return false;
  }
  
  return true;
});

// Pre-save hooks for data validation and calculations
playlistSchema.pre('save', async function(next) {
  try {
    // Update version on modification
    if (this.isModified() && !this.isNew) {
      this.version += 1;
      this.lastModified = new Date();
    }

    // Calculate total duration and item count
    if (this.isModified('items')) {
      await this.calculateTotals();
    }

    // Ensure unique order values within the playlist
    if (this.isModified('items')) {
      this.items.forEach((item, index) => {
        if (item.order === undefined || item.order === null) {
          item.order = index;
        }
      });
      
      // Sort items by order
      this.items.sort((a, b) => a.order - b.order);
    }

    // Validate collaborator permissions
    if (this.isModified('collaborators')) {
      const userIds = this.collaborators.map(c => c.user.toString());
      const uniqueUserIds = [...new Set(userIds)];
      if (userIds.length !== uniqueUserIds.length) {
        throw new Error('Duplicate collaborators are not allowed');
      }
    }

    // Ensure owner is not in collaborators
    if (this.collaborators) {
      this.collaborators = this.collaborators.filter(
        c => c.user.toString() !== this.owner.toString()
      );
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
playlistSchema.methods.calculateTotals = async function() {
  if (!this.items || this.items.length === 0) {
    this.totalDuration = 0;
    this.totalItems = 0;
    return;
  }

  // Populate media for duration calculation
  await this.populate('items.mediaId', 'duration videoDuration type');
  
  let totalDuration = 0;
  
  for (const item of this.items) {
    if (!item.mediaId) continue;
    
    // Use custom duration if specified, otherwise use media default
    let itemDuration = item.duration;
    if (!itemDuration) {
      const media = item.mediaId;
      itemDuration = media.type === 'image' ? media.duration : media.videoDuration;
    }
    
    totalDuration += itemDuration || 0;
    
    // Add transition duration
    if (item.transitions && item.transitions.duration) {
      totalDuration += item.transitions.duration;
    }
  }
  
  // Add pause between items
  if (this.settings && this.settings.pauseBetweenItems && this.items.length > 1) {
    totalDuration += this.settings.pauseBetweenItems * (this.items.length - 1);
  }
  
  this.totalDuration = Math.round(totalDuration * 100) / 100; // Round to 2 decimal places
  this.totalItems = this.items.length;
};

playlistSchema.methods.addMediaItem = function(mediaId, options = {}) {
  const { order, duration, transitions, conditions, notes } = options;
  
  const newOrder = order !== undefined ? order : this.items.length;
  
  // Shift existing items if inserting in middle
  if (newOrder < this.items.length) {
    this.items.forEach(item => {
      if (item.order >= newOrder) {
        item.order += 1;
      }
    });
  }
  
  const newItem = {
    mediaId,
    order: newOrder,
    duration,
    transitions: transitions || { type: 'none', duration: 0.5 },
    conditions: conditions || [],
    metadata: {
      addedAt: new Date(),
      addedBy: this.owner, // Will be updated by controller with actual user
      notes: notes || ''
    }
  };
  
  this.items.push(newItem);
  return newItem;
};

playlistSchema.methods.removeMediaItem = function(itemId) {
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId.toString());
  if (itemIndex === -1) {
    throw new Error('Item not found in playlist');
  }
  
  const removedItem = this.items[itemIndex];
  this.items.splice(itemIndex, 1);
  
  // Reorder remaining items
  this.items.forEach((item, index) => {
    item.order = index;
  });
  
  return removedItem;
};

playlistSchema.methods.reorderItems = function(newOrder) {
  if (!Array.isArray(newOrder) || newOrder.length !== this.items.length) {
    throw new Error('Invalid reorder array');
  }
  
  const reorderedItems = [];
  newOrder.forEach((itemId, index) => {
    const item = this.items.find(i => i._id.toString() === itemId.toString());
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    item.order = index;
    reorderedItems.push(item);
  });
  
  this.items = reorderedItems;
};

playlistSchema.methods.duplicate = function(newName, newOwner) {
  const duplicatedPlaylist = {
    name: newName || `${this.name} (Copy)`,
    description: this.description,
    owner: newOwner || this.owner,
    items: this.items.map(item => ({
      mediaId: item.mediaId,
      order: item.order,
      duration: item.duration,
      transitions: item.transitions,
      conditions: item.conditions,
      metadata: {
        addedAt: new Date(),
        addedBy: newOwner || this.owner,
        notes: item.metadata.notes
      }
    })),
    settings: { ...this.settings },
    tags: [...this.tags],
    isActive: true,
    isPublic: false
  };
  
  return new this.constructor(duplicatedPlaylist);
};

playlistSchema.methods.recordPlayback = function(screenId, duration, completionRate) {
  // Update analytics
  this.analytics.totalPlays += 1;
  this.analytics.lastPlayed = new Date();
  
  // Calculate new average duration
  const totalDuration = (this.analytics.averagePlayDuration * (this.analytics.totalPlays - 1)) + duration;
  this.analytics.averagePlayDuration = totalDuration / this.analytics.totalPlays;
  
  // Add to play history (keep last 100 entries)
  this.analytics.playHistory.push({
    screenId,
    playedAt: new Date(),
    duration,
    completionRate
  });
  
  if (this.analytics.playHistory.length > 100) {
    this.analytics.playHistory = this.analytics.playHistory.slice(-100);
  }
};

playlistSchema.methods.getScheduleStatus = function() {
  const now = new Date();
  const schedule = this.schedule;
  
  if (!this.isScheduled) {
    return { status: 'no-schedule', message: 'No schedule configured' };
  }
  
  // Check if currently active
  if (this.isCurrentlyActive) {
    return { status: 'active', message: 'Currently playing according to schedule' };
  }
  
  // Check if before start date
  if (schedule.startDate && now < schedule.startDate) {
    return { status: 'pending', message: `Scheduled to start on ${schedule.startDate.toLocaleDateString()}` };
  }
  
  // Check if after end date
  if (schedule.endDate && now > schedule.endDate) {
    return { status: 'expired', message: `Schedule ended on ${schedule.endDate.toLocaleDateString()}` };
  }
  
  return { status: 'inactive', message: 'Not currently in scheduled time window' };
};

// Static methods for querying playlists
playlistSchema.statics.findUserPlaylists = function(userId, filters = {}) {
  const query = { 
    $or: [
      { owner: userId },
      { 'collaborators.user': userId }
    ],
    isActive: true 
  };
  
  // Apply filters
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  if (filters.assignedToScreen) {
    query.assignedScreens = filters.assignedToScreen;
  }
  
  return this.find(query);
};

playlistSchema.statics.findActiveForScreen = function(screenId) {
  const now = new Date();
  
  return this.find({
    assignedScreens: screenId,
    isActive: true,
    $or: [
      { 'schedule.startDate': { $exists: false } },
      { 'schedule.startDate': { $lte: now } }
    ]
  }).populate('items.mediaId', 'url secureUrl type duration videoDuration');
};

playlistSchema.statics.getUserPlaylistStats = async function(userId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        $or: [
          { owner: new mongoose.Types.ObjectId(userId) },
          { 'collaborators.user': new mongoose.Types.ObjectId(userId) }
        ],
        isActive: true 
      } 
    },
    {
      $group: {
        _id: null,
        totalPlaylists: { $sum: 1 },
        totalItems: { $sum: '$totalItems' },
        totalDuration: { $sum: '$totalDuration' },
        totalPlays: { $sum: '$analytics.totalPlays' },
        avgPlaylistDuration: { $avg: '$totalDuration' },
        avgItemsPerPlaylist: { $avg: '$totalItems' }
      }
    }
  ]);

  return stats[0] || {
    totalPlaylists: 0,
    totalItems: 0,
    totalDuration: 0,
    totalPlays: 0,
    avgPlaylistDuration: 0,
    avgItemsPerPlaylist: 0
  };
};

// Ensure unique order within playlist items
playlistSchema.path('items').validate(function(items) {
  if (!items || items.length === 0) return true;
  
  const orders = items.map(item => item.order);
  const uniqueOrders = [...new Set(orders)];
  
  return orders.length === uniqueOrders.length;
}, 'Duplicate order values are not allowed within a playlist');

// Remove sensitive fields when converting to JSON
playlistSchema.methods.toJSON = function() {
  const playlistObject = this.toObject();
  
  // Add virtual properties
  playlistObject.itemCount = this.itemCount;
  playlistObject.averageItemDuration = this.averageItemDuration;
  playlistObject.isScheduled = this.isScheduled;
  playlistObject.isCurrentlyActive = this.isCurrentlyActive;
  playlistObject.scheduleStatus = this.getScheduleStatus();
  
  return playlistObject;
};

module.exports = mongoose.model('Playlist', playlistSchema);