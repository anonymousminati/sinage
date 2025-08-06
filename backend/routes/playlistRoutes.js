const express = require('express');
const { verifyJWT, requireAuth } = require('../middleware/authMiddleware');
const {
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  duplicatePlaylist,
  addMediaToPlaylist,
  removeMediaFromPlaylist,
  reorderPlaylistItems,
  reorderPlaylistItemsUpdate,
  assignPlaylistToScreens,
  getPlaylistAssignments,
  getPlaylistStats
} = require('../controllers/playlistController');

const router = express.Router();

/**
 * Playlist Routes
 * All routes require authentication
 * Comprehensive RESTful API for playlist management
 */

// Apply authentication middleware to all routes
router.use(verifyJWT);
router.use(requireAuth);

/**
 * @route   GET /api/playlists
 * @desc    Get all playlists with filtering and pagination
 * @access  Private
 * @query   page, limit, search, tags, assignedToScreen, isPublic, sort, order
 */
router.get('/', getPlaylists);

/**
 * @route   POST /api/playlists
 * @desc    Create new playlist
 * @access  Private
 * @body    name, description, isPublic, tags, settings, schedule
 */
router.post('/', createPlaylist);

/**
 * @route   GET /api/playlists/:id
 * @desc    Get specific playlist by ID with full details
 * @access  Private (owner, collaborator, or public)
 */
router.get('/:id', getPlaylistById);

/**
 * @route   PUT /api/playlists/:id
 * @desc    Update playlist metadata
 * @access  Private (owner or editor/admin collaborator)
 * @body    name, description, isPublic, tags, settings, schedule
 */
router.put('/:id', updatePlaylist);

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Delete playlist (soft delete)
 * @access  Private (owner only)
 */
router.delete('/:id', deletePlaylist);

/**
 * @route   POST /api/playlists/:id/duplicate
 * @desc    Duplicate existing playlist
 * @access  Private (owner, collaborator, or public)
 * @body    name (optional custom name for duplicate)
 */
router.post('/:id/duplicate', duplicatePlaylist);

// ============================================================================
// PLAYLIST ITEM MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/playlists/:id/items
 * @desc    Add media item to playlist
 * @access  Private (owner or editor/admin collaborator)
 * @body    mediaId, order, duration, transitions, conditions, notes
 */
router.post('/:id/items', addMediaToPlaylist);

/**
 * @route   DELETE /api/playlists/:id/items/:itemId
 * @desc    Remove media item from playlist
 * @access  Private (owner or editor/admin collaborator)
 */
router.delete('/:id/items/:itemId', removeMediaFromPlaylist);

/**
 * @route   PUT /api/playlists/:id/items/reorder
 * @desc    Reorder playlist items
 * @access  Private (owner or editor/admin collaborator)
 * @body    itemOrder (array of item IDs in new order)
 */
router.put('/:id/items/reorder', reorderPlaylistItems);

/**
 * @route   PUT /api/playlists/:id/reorder
 * @desc    Reorder specific playlist items with granular control
 * @access  Private (owner or editor/admin collaborator)
 * @body    items (array of {id, order} objects for specific item updates)
 */
router.put('/:id/reorder', reorderPlaylistItemsUpdate);

// ============================================================================
// SCREEN ASSIGNMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/playlists/:id/assign
 * @desc    Assign or unassign playlist to screens
 * @access  Private (owner or admin collaborator)
 * @body    screenIds (array), action ('assign' or 'unassign')
 */
router.post('/:id/assign', assignPlaylistToScreens);

/**
 * @route   GET /api/playlists/:id/assignments
 * @desc    Get playlist screen assignments
 * @access  Private (owner, collaborator, or public)
 */
router.get('/:id/assignments', getPlaylistAssignments);

/**
 * @route   DELETE /api/playlists/:id/assign/:screenId
 * @desc    Remove playlist from specific screen
 * @access  Private (owner or admin collaborator)
 */
router.delete('/:id/assign/:screenId', (req, res, next) => {
  // Transform single screen unassignment to use the main assign function
  req.body = {
    screenIds: [req.params.screenId],
    action: 'unassign'
  };
  assignPlaylistToScreens(req, res, next);
});

// ============================================================================
// ANALYTICS AND STATISTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/playlists/:id/stats
 * @desc    Get comprehensive playlist statistics and analytics
 * @access  Private (owner, collaborator, or public)
 */
router.get('/:id/stats', getPlaylistStats);

/**
 * @route   GET /api/playlists/:id/analytics
 * @desc    Alias for stats endpoint (for backward compatibility)
 * @access  Private (owner, collaborator, or public)
 */
router.get('/:id/analytics', getPlaylistStats);

// ============================================================================
// BULK OPERATIONS ROUTES
// ============================================================================

/**
 * @route   POST /api/playlists/bulk/delete
 * @desc    Delete multiple playlists
 * @access  Private (owner only for each playlist)
 * @body    playlistIds (array of playlist IDs)
 */
router.post('/bulk/delete', async (req, res) => {
  try {
    const { playlistIds } = req.body;
    
    if (!Array.isArray(playlistIds) || playlistIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'playlistIds array is required'
      });
    }

    const mongoose = require('mongoose');
    const Playlist = require('../models/playlistModel');
    const winston = require('winston');
    
    // Validate all IDs
    const invalidIds = playlistIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid playlist IDs provided',
        invalidIds
      });
    }

    // Find playlists owned by user
    const playlists = await Playlist.find({
      _id: { $in: playlistIds },
      owner: req.user.id,
      isActive: true
    });

    if (playlists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No playlists found or access denied'
      });
    }

    // Soft delete playlists
    const deleteResult = await Playlist.updateMany(
      {
        _id: { $in: playlists.map(p => p._id) },
        owner: req.user.id
      },
      {
        isActive: false,
        lastModified: new Date()
      }
    );

    winston.info('Bulk playlist deletion:', {
      service: 'playlist',
      userId: req.user.id,
      requestedCount: playlistIds.length,
      deletedCount: deleteResult.modifiedCount,
      playlistIds: playlists.map(p => p._id)
    });

    res.json({
      success: true,
      message: `${deleteResult.modifiedCount} playlists deleted successfully`,
      data: {
        requested: playlistIds.length,
        deleted: deleteResult.modifiedCount,
        skipped: playlistIds.length - deleteResult.modifiedCount
      }
    });

  } catch (error) {
    const winston = require('winston');
    winston.error('Bulk playlist deletion failed:', {
      service: 'playlist',
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete playlists',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/playlists/bulk/assign
 * @desc    Assign multiple playlists to screens
 * @access  Private (owner or admin collaborator for each playlist)
 * @body    playlistIds (array), screenIds (array), action ('assign' or 'unassign')
 */
router.post('/bulk/assign', async (req, res) => {
  try {
    const { playlistIds, screenIds, action = 'assign' } = req.body;
    
    if (!Array.isArray(playlistIds) || !Array.isArray(screenIds) || 
        playlistIds.length === 0 || screenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'playlistIds and screenIds arrays are required'
      });
    }

    if (!['assign', 'unassign'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be either "assign" or "unassign"'
      });
    }

    const mongoose = require('mongoose');
    const Playlist = require('../models/playlistModel');
    const winston = require('winston');
    
    // Validate all IDs
    const invalidPlaylistIds = playlistIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    const invalidScreenIds = screenIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    
    if (invalidPlaylistIds.length > 0 || invalidScreenIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IDs provided',
        invalidPlaylistIds,
        invalidScreenIds
      });
    }

    // Find playlists user has admin access to
    const playlists = await Playlist.find({
      _id: { $in: playlistIds },
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id, 'collaborators.permission': 'admin' }
      ],
      isActive: true
    });

    if (playlists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No playlists found or insufficient permissions'
      });
    }

    let updateCount = 0;
    const results = [];

    for (const playlist of playlists) {
      try {
        if (action === 'assign') {
          // Add screens to playlist (avoid duplicates)
          const currentScreenIds = playlist.assignedScreens.map(id => id.toString());
          const newScreenIds = screenIds.filter(screenId => !currentScreenIds.includes(screenId));
          
          if (newScreenIds.length > 0) {
            playlist.assignedScreens.push(...newScreenIds);
            playlist.lastModified = new Date();
            await playlist.save();
            updateCount++;
          }
        } else {
          // Remove screens from playlist
          const originalLength = playlist.assignedScreens.length;
          playlist.assignedScreens = playlist.assignedScreens.filter(
            screenId => !screenIds.includes(screenId.toString())
          );
          
          if (playlist.assignedScreens.length !== originalLength) {
            playlist.lastModified = new Date();
            await playlist.save();
            updateCount++;
          }
        }

        results.push({
          playlistId: playlist._id,
          playlistName: playlist.name,
          success: true
        });

      } catch (error) {
        results.push({
          playlistId: playlist._id,
          playlistName: playlist.name,
          success: false,
          error: error.message
        });
      }
    }

    winston.info(`Bulk playlist ${action}ment:`, {
      service: 'playlist',
      userId: req.user.id,
      action,
      playlistIds,
      screenIds,
      updatedCount: updateCount
    });

    res.json({
      success: true,
      message: `Bulk ${action}ment completed`,
      data: {
        requested: playlistIds.length,
        processed: playlists.length,
        updated: updateCount,
        results
      }
    });

  } catch (error) {
    const winston = require('winston');
    winston.error('Bulk playlist assignment failed:', {
      service: 'playlist',
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to process bulk assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ============================================================================
// SEARCH AND DISCOVERY ROUTES
// ============================================================================

/**
 * @route   GET /api/playlists/search/advanced
 * @desc    Advanced playlist search with multiple criteria
 * @access  Private
 * @query   q, tags, owner, dateRange, duration, items, status
 */
router.get('/search/advanced', async (req, res) => {
  try {
    const {
      q: searchQuery,
      tags,
      owner,
      dateRange,
      minDuration,
      maxDuration,
      minItems,
      maxItems,
      status = 'active',
      page = 1,
      limit = 20
    } = req.query;

    const mongoose = require('mongoose');
    const Playlist = require('../models/playlistModel');
    const winston = require('winston');

    // Build aggregation pipeline
    const pipeline = [];

    // Match stage
    const matchCriteria = {
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id },
        { isPublic: true }
      ]
    };

    if (status === 'active') {
      matchCriteria.isActive = true;
    } else if (status === 'inactive') {
      matchCriteria.isActive = false;
    }

    // Text search
    if (searchQuery) {
      matchCriteria.$text = { $search: searchQuery };
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      matchCriteria.tags = { $in: tagArray };
    }

    // Owner filter
    if (owner && mongoose.Types.ObjectId.isValid(owner)) {
      matchCriteria.owner = new mongoose.Types.ObjectId(owner);
    }

    // Duration filters
    if (minDuration || maxDuration) {
      matchCriteria.totalDuration = {};
      if (minDuration) matchCriteria.totalDuration.$gte = parseFloat(minDuration);
      if (maxDuration) matchCriteria.totalDuration.$lte = parseFloat(maxDuration);
    }

    // Items count filters
    if (minItems || maxItems) {
      matchCriteria.totalItems = {};
      if (minItems) matchCriteria.totalItems.$gte = parseInt(minItems);
      if (maxItems) matchCriteria.totalItems.$lte = parseInt(maxItems);
    }

    // Date range filter
    if (dateRange) {
      const [startDate, endDate] = dateRange.split(',');
      if (startDate && endDate) {
        matchCriteria.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
    }

    pipeline.push({ $match: matchCriteria });

    // Add text score for sorting if text search is used
    if (searchQuery) {
      pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
    }

    // Lookup for populated fields
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }
      },
      { $unwind: '$owner' }
    );

    // Sort stage
    const sortStage = searchQuery 
      ? { score: { $meta: 'textScore' }, lastModified: -1 }
      : { lastModified: -1 };
    
    pipeline.push({ $sort: sortStage });

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    // Execute search
    const [results, totalCount] = await Promise.all([
      Playlist.aggregate(pipeline),
      Playlist.countDocuments(matchCriteria)
    ]);

    winston.info('Advanced playlist search:', {
      service: 'playlist',
      userId: req.user.id,
      query: searchQuery,
      filters: { tags, owner, dateRange, minDuration, maxDuration, minItems, maxItems },
      resultCount: results.length,
      totalCount
    });

    res.json({
      success: true,
      message: 'Advanced search completed',
      data: {
        playlists: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          hasNext: page < Math.ceil(totalCount / parseInt(limit)),
          hasPrev: page > 1
        },
        searchCriteria: {
          query: searchQuery,
          tags,
          owner,
          dateRange,
          minDuration,
          maxDuration,
          minItems,
          maxItems,
          status
        }
      }
    });

  } catch (error) {
    const winston = require('winston');
    winston.error('Advanced playlist search failed:', {
      service: 'playlist',
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Advanced search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;