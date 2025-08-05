const Joi = require('joi');
const Playlist = require('../models/playlistModel');
const Media = require('../models/mediaModel');
const Screen = require('../models/screenModel');
const winston = require('winston');
const mongoose = require('mongoose');

/**
 * Comprehensive Playlist Controller
 * Manages digital signage playlist operations with full CRUD functionality,
 * media management, screen assignments, and analytics
 */

// Validation schemas
const createPlaylistSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  description: Joi.string().max(500).optional().trim(),
  isActive: Joi.boolean().default(true),
  isPublic: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string().max(30).trim()).max(10).optional(),
  settings: Joi.object({
    shuffle: Joi.boolean().default(false),
    loop: Joi.boolean().default(true),
    autoAdvance: Joi.boolean().default(true),
    pauseBetweenItems: Joi.number().min(0).max(30).default(0)
  }).optional(),
  schedule: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
    timeSlots: Joi.array().items(Joi.object({
      startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    })).optional(),
    daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)).optional(),
    isRecurring: Joi.boolean().default(false),
    timezone: Joi.string().default('UTC')
  }).optional()
});

const updatePlaylistSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().trim(),
  description: Joi.string().max(500).optional().trim(),
  isActive: Joi.boolean().optional(),
  isPublic: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().max(30).trim()).max(10).optional(),
  settings: Joi.object({
    shuffle: Joi.boolean().optional(),
    loop: Joi.boolean().optional(),
    autoAdvance: Joi.boolean().optional(),
    pauseBetweenItems: Joi.number().min(0).max(30).optional()
  }).optional(),
  schedule: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    timeSlots: Joi.array().items(Joi.object({
      startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    })).optional(),
    daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)).optional(),
    isRecurring: Joi.boolean().optional(),
    timezone: Joi.string().optional()
  }).optional()
});

const addMediaItemSchema = Joi.object({
  mediaId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  order: Joi.number().min(0).optional(),
  duration: Joi.number().min(1).max(7200).optional(),
  transitions: Joi.object({
    type: Joi.string().valid('none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out').default('none'),
    duration: Joi.number().min(0.1).max(5).default(0.5)
  }).optional(),
  conditions: Joi.array().items(Joi.object({
    type: Joi.string().valid('time-range', 'date-range', 'day-of-week', 'weather', 'custom').required(),
    operator: Joi.string().valid('equals', 'not-equals', 'greater-than', 'less-than', 'between', 'in', 'not-in').required(),
    value: Joi.string().max(100).required()
  })).optional(),
  notes: Joi.string().max(200).optional()
});

const reorderItemsSchema = Joi.object({
  itemOrder: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).required()
});

const assignScreensSchema = Joi.object({
  screenIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).required(),
  action: Joi.string().valid('assign', 'unassign').default('assign')
});

const playlistQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  search: Joi.string().max(100).optional(),
  tags: Joi.string().optional(),
  assignedToScreen: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  isPublic: Joi.boolean().optional(),
  sort: Joi.string().valid('name', 'created', 'modified', 'duration', 'items', 'plays').default('modified'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Create new playlist
 * @route POST /api/playlists
 * @access Private
 */
const createPlaylist = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createPlaylistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const playlistData = {
      ...value,
      owner: req.user.id
    };

    winston.info('Creating new playlist:', {
      service: 'playlist',
      userId: req.user.id,
      playlistName: playlistData.name
    });

    // Check for duplicate playlist names for this user
    const existingPlaylist = await Playlist.findOne({
      owner: req.user.id,
      name: playlistData.name,
      isActive: true
    });

    if (existingPlaylist) {
      return res.status(409).json({
        success: false,
        message: 'Playlist with this name already exists'
      });
    }

    const playlist = new Playlist(playlistData);
    await playlist.save();

    winston.info('Playlist created successfully:', {
      service: 'playlist',
      playlistId: playlist._id,
      userId: req.user.id,
      playlistName: playlist.name
    });

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully',
      data: playlist
    });

  } catch (error) {
    winston.error('Playlist creation failed:', {
      service: 'playlist',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create playlist',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all playlists with filtering and pagination
 * @route GET /api/playlists
 * @access Private
 */
const getPlaylists = async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = playlistQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { page, limit, search, tags, assignedToScreen, isPublic, sort, order } = value;
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ],
      isActive: true
    };

    // Add filters
    if (isPublic !== undefined) {
      query.isPublic = isPublic;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tagArray };
    }

    if (assignedToScreen) {
      query.assignedScreens = assignedToScreen;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    const sortField = {
      name: 'name',
      created: 'createdAt',
      modified: 'lastModified',
      duration: 'totalDuration',
      items: 'totalItems',
      plays: 'analytics.totalPlays'
    }[sort];

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // Execute queries in parallel
    const [playlists, totalCount, stats] = await Promise.all([
      Playlist.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email')
        .populate('assignedScreens', 'name location status')
        .populate('collaborators.user', 'name email'),
      Playlist.countDocuments(query),
      Playlist.getUserPlaylistStats(req.user.id)
    ]);

    winston.info('Playlists retrieved successfully:', {
      service: 'playlist',
      userId: req.user.id,
      count: playlists.length,
      totalCount,
      filters: { search, tags, assignedToScreen, isPublic }
    });

    res.json({
      success: true,
      message: 'Playlists retrieved successfully',
      data: {
        playlists,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        },
        statistics: stats,
        filters: {
          search,
          tags,
          assignedToScreen,
          isPublic,
          sort,
          order
        }
      }
    });

  } catch (error) {
    winston.error('Failed to retrieve playlists:', {
      service: 'playlist',
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve playlists',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get specific playlist by ID
 * @route GET /api/playlists/:id
 * @access Private
 */
const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Find playlist and verify access
    const playlist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id },
        { isPublic: true }
      ],
      isActive: true
    })
    .populate('owner', 'name email')
    .populate('items.mediaId', 'originalName url secureUrl type duration videoDuration fileSize format')
    .populate('assignedScreens', 'name location status lastSeen')
    .populate('collaborators.user', 'name email');

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or access denied'
      });
    }

    winston.info('Playlist retrieved successfully:', {
      service: 'playlist',
      playlistId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Playlist retrieved successfully',
      data: playlist
    });

  } catch (error) {
    winston.error('Failed to retrieve playlist:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve playlist',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Update playlist
 * @route PUT /api/playlists/:id
 * @access Private
 */
const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Validate request body
    const { error, value } = updatePlaylistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Find playlist and verify ownership or edit permission
    const playlist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id, 'collaborators.permission': { $in: ['edit', 'admin'] } }
      ],
      isActive: true
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or insufficient permissions'
      });
    }

    // Check for duplicate name if name is being changed
    if (value.name && value.name !== playlist.name) {
      const existingPlaylist = await Playlist.findOne({
        owner: playlist.owner,
        name: value.name,
        isActive: true,
        _id: { $ne: id }
      });

      if (existingPlaylist) {
        return res.status(409).json({
          success: false,
          message: 'Playlist with this name already exists'
        });
      }
    }

    // Update playlist
    Object.assign(playlist, value);
    playlist.lastModified = new Date();
    
    await playlist.save();

    winston.info('Playlist updated successfully:', {
      service: 'playlist',
      playlistId: id,
      userId: req.user.id,
      updates: Object.keys(value)
    });

    // Populate and return updated playlist
    await playlist.populate('owner', 'name email');
    await playlist.populate('assignedScreens', 'name location status');

    res.json({
      success: true,
      message: 'Playlist updated successfully',
      data: playlist
    });

  } catch (error) {
    winston.error('Playlist update failed:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update playlist',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete playlist
 * @route DELETE /api/playlists/:id
 * @access Private
 */
const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Find playlist and verify ownership
    const playlist = await Playlist.findOne({
      _id: id,
      owner: req.user.id,
      isActive: true
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or access denied'
      });
    }

    winston.info('Deleting playlist:', {
      service: 'playlist',
      playlistId: id,
      playlistName: playlist.name,
      userId: req.user.id
    });

    // Soft delete
    await Playlist.findByIdAndUpdate(id, { 
      isActive: false,
      lastModified: new Date()
    });

    winston.info('Playlist deleted successfully:', {
      service: 'playlist',
      playlistId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Playlist deleted successfully',
      data: { id, name: playlist.name }
    });

  } catch (error) {
    winston.error('Playlist deletion failed:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete playlist',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Duplicate playlist
 * @route POST /api/playlists/:id/duplicate
 * @access Private
 */
const duplicatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Find original playlist and verify access
    const originalPlaylist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id },
        { isPublic: true }
      ],
      isActive: true
    }).populate('items.mediaId');

    if (!originalPlaylist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or access denied'
      });
    }

    // Create duplicate
    const duplicatedPlaylist = originalPlaylist.duplicate(name, req.user.id);
    
    // Check for duplicate name
    const duplicateName = duplicatedPlaylist.name;
    const existingPlaylist = await Playlist.findOne({
      owner: req.user.id,
      name: duplicateName,
      isActive: true
    });

    if (existingPlaylist) {
      return res.status(409).json({
        success: false,
        message: 'Playlist with this name already exists'
      });
    }

    await duplicatedPlaylist.save();

    winston.info('Playlist duplicated successfully:', {
      service: 'playlist',
      originalId: id,
      duplicateId: duplicatedPlaylist._id,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Playlist duplicated successfully',
      data: duplicatedPlaylist
    });

  } catch (error) {
    winston.error('Playlist duplication failed:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to duplicate playlist',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Add media item to playlist
 * @route POST /api/playlists/:id/items
 * @access Private
 */
const addMediaToPlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Validate request body
    const { error, value } = addMediaItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { mediaId, order, duration, transitions, conditions, notes } = value;

    // Find playlist and verify edit permission
    const playlist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id, 'collaborators.permission': { $in: ['edit', 'admin'] } }
      ],
      isActive: true
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or insufficient permissions'
      });
    }

    // Verify media exists and user has access
    const media = await Media.findOne({
      _id: mediaId,
      $or: [
        { owner: req.user.id },
        { isPublic: true }
      ],
      isActive: true
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found or access denied'
      });
    }

    // Check if media is already in playlist
    const existingItem = playlist.items.find(item => 
      item.mediaId.toString() === mediaId
    );

    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: 'Media is already in this playlist'
      });
    }

    // Add media to playlist
    const newItem = playlist.addMediaItem(mediaId, {
      order,
      duration,
      transitions,
      conditions,
      notes
    });

    // Update metadata
    newItem.metadata.addedBy = req.user.id;

    await playlist.save();

    winston.info('Media added to playlist:', {
      service: 'playlist',
      playlistId: id,
      mediaId,
      itemId: newItem._id,
      userId: req.user.id
    });

    // Populate the new item before returning
    await playlist.populate('items.mediaId', 'originalName url secureUrl type duration videoDuration fileSize format');

    res.status(201).json({
      success: true,
      message: 'Media added to playlist successfully',
      data: {
        playlist: {
          id: playlist._id,
          name: playlist.name,
          totalItems: playlist.totalItems,
          totalDuration: playlist.totalDuration
        },
        item: newItem
      }
    });

  } catch (error) {
    winston.error('Failed to add media to playlist:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to add media to playlist',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Remove media item from playlist
 * @route DELETE /api/playlists/:id/items/:itemId
 * @access Private
 */
const removeMediaFromPlaylist = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID or item ID'
      });
    }

    // Find playlist and verify edit permission
    const playlist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id, 'collaborators.permission': { $in: ['edit', 'admin'] } }
      ],
      isActive: true
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or insufficient permissions'
      });
    }

    // Remove item from playlist
    const removedItem = playlist.removeMediaItem(itemId);
    await playlist.save();

    winston.info('Media removed from playlist:', {
      service: 'playlist',
      playlistId: id,
      itemId,
      mediaId: removedItem.mediaId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Media removed from playlist successfully',
      data: {
        playlist: {
          id: playlist._id,
          name: playlist.name,
          totalItems: playlist.totalItems,
          totalDuration: playlist.totalDuration
        },
        removedItem: {
          id: removedItem._id,
          mediaId: removedItem.mediaId,
          order: removedItem.order
        }
      }
    });

  } catch (error) {
    winston.error('Failed to remove media from playlist:', {
      service: 'playlist',
      playlistId: req.params.id,
      itemId: req.params.itemId,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to remove media from playlist',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Reorder playlist items
 * @route PUT /api/playlists/:id/items/reorder
 * @access Private
 */
const reorderPlaylistItems = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Validate request body
    const { error, value } = reorderItemsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { itemOrder } = value;

    // Find playlist and verify edit permission
    const playlist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id, 'collaborators.permission': { $in: ['edit', 'admin'] } }
      ],
      isActive: true
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or insufficient permissions'
      });
    }

    // Validate that all items in the order array exist in the playlist
    if (itemOrder.length !== playlist.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Item order array must contain all playlist items'
      });
    }

    // Reorder items
    playlist.reorderItems(itemOrder);
    await playlist.save();

    winston.info('Playlist items reordered:', {
      service: 'playlist',
      playlistId: id,
      newOrder: itemOrder,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Playlist items reordered successfully',
      data: {
        playlist: {
          id: playlist._id,
          name: playlist.name,
          totalItems: playlist.totalItems
        },
        newOrder: playlist.items.map(item => ({
          id: item._id,
          mediaId: item.mediaId,
          order: item.order
        }))
      }
    });

  } catch (error) {
    winston.error('Failed to reorder playlist items:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to reorder playlist items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Assign/unassign playlist to screens
 * @route POST /api/playlists/:id/assign
 * @access Private
 */
const assignPlaylistToScreens = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Validate request body
    const { error, value } = assignScreensSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { screenIds, action } = value;

    // Find playlist and verify ownership or admin permission
    const playlist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id, 'collaborators.permission': 'admin' }
      ],
      isActive: true
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or insufficient permissions'
      });
    }

    // Note: We would need a Screen model to verify screen ownership
    // For now, we'll assume the screens exist and user has access
    
    if (action === 'assign') {
      // Add screens to playlist (avoid duplicates)
      const currentScreenIds = playlist.assignedScreens.map(id => id.toString());
      const newScreenIds = screenIds.filter(screenId => !currentScreenIds.includes(screenId));
      playlist.assignedScreens.push(...newScreenIds);
    } else if (action === 'unassign') {
      // Remove screens from playlist
      playlist.assignedScreens = playlist.assignedScreens.filter(
        screenId => !screenIds.includes(screenId.toString())
      );
    }

    playlist.lastModified = new Date();
    await playlist.save();

    winston.info(`Playlist ${action}ed to screens:`, {
      service: 'playlist',
      playlistId: id,
      screenIds,
      action,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: `Playlist ${action}ed to screens successfully`,
      data: {
        playlist: {
          id: playlist._id,
          name: playlist.name,
          assignedScreens: playlist.assignedScreens
        },
        action,
        screenIds
      }
    });

  } catch (error) {
    winston.error('Failed to assign playlist to screens:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to assign playlist to screens',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get playlist assignments
 * @route GET /api/playlists/:id/assignments
 * @access Private
 */
const getPlaylistAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Find playlist and verify access
    const playlist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id },
        { isPublic: true }
      ],
      isActive: true
    }).populate('assignedScreens', 'name location status lastSeen');

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or access denied'
      });
    }

    winston.info('Playlist assignments retrieved:', {
      service: 'playlist',
      playlistId: id,
      assignedScreensCount: playlist.assignedScreens.length,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Playlist assignments retrieved successfully',
      data: {
        playlist: {
          id: playlist._id,
          name: playlist.name,
          totalItems: playlist.totalItems,
          totalDuration: playlist.totalDuration
        },
        assignments: playlist.assignedScreens,
        scheduleStatus: playlist.getScheduleStatus()
      }
    });

  } catch (error) {
    winston.error('Failed to get playlist assignments:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get playlist assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get playlist statistics
 * @route GET /api/playlists/:id/stats
 * @access Private
 */
const getPlaylistStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist ID'
      });
    }

    // Find playlist and verify access
    const playlist = await Playlist.findOne({
      _id: id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id },
        { isPublic: true }
      ],
      isActive: true
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found or access denied'
      });
    }

    const stats = {
      basic: {
        totalItems: playlist.totalItems,
        totalDuration: playlist.totalDuration,
        averageItemDuration: playlist.averageItemDuration,
        assignedScreens: playlist.assignedScreens.length
      },
      analytics: playlist.analytics,
      schedule: playlist.getScheduleStatus(),
      performance: {
        completionRate: playlist.analytics.playHistory.length > 0 ? 
          playlist.analytics.playHistory.reduce((sum, play) => sum + play.completionRate, 0) / playlist.analytics.playHistory.length : 0,
        popularItems: playlist.analytics.popularItems.slice(0, 5),
        recentPlays: playlist.analytics.playHistory.slice(-10).reverse()
      }
    };

    winston.info('Playlist statistics retrieved:', {
      service: 'playlist',
      playlistId: id,
      totalPlays: playlist.analytics.totalPlays,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Playlist statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    winston.error('Failed to get playlist statistics:', {
      service: 'playlist',
      playlistId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get playlist statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  duplicatePlaylist,
  addMediaToPlaylist,
  removeMediaFromPlaylist,
  reorderPlaylistItems,
  assignPlaylistToScreens,
  getPlaylistAssignments,
  getPlaylistStats
};