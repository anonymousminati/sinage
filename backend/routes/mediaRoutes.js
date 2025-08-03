const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifyJWT, requireAuth } = require('../middleware/authMiddleware');
const {
  upload,
  uploadMedia,
  getMedia,
  updateMedia,
  deleteMedia,
  generateDownloadUrl,
  getMediaStats,
  createVideoThumbnail,
  handleMulterError
} = require('../controllers/mediaController');

const router = express.Router();

/**
 * Rate limiting for media uploads
 * More restrictive due to resource-intensive operations
 */
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 upload requests per windowMs
  message: {
    success: false,
    message: 'Too many upload requests. Please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful uploads to allow batch processing
  skip: (req, res) => res.statusCode < 400
});

/**
 * Apply authentication to all media routes
 */
router.use(verifyJWT);
router.use(requireAuth);

/**
 * @route   POST /api/media/upload
 * @desc    Upload single media file with metadata handling
 * @access  Private
 * @body    {file} file - Media file to upload
 * @body    {number} [duration] - Display duration for images (1-300 seconds)
 * @body    {string} [tags] - Comma-separated tags
 * @body    {string} [description] - File description (max 500 chars)
 */
router.post('/upload', 
  uploadRateLimit,
  upload.single('file'),
  uploadMedia,
  handleMulterError
);

/**
 * @route   GET /api/media
 * @desc    Get user's media with advanced filtering and pagination
 * @access  Private
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=20] - Items per page (max 100)
 * @query   {string} [type] - Filter by type (image/video)
 * @query   {string} [search] - Search in name, description, tags
 * @query   {string} [sort=date] - Sort by (date/name/size/usage)
 * @query   {string} [order=desc] - Sort order (asc/desc)
 * @query   {string} [tags] - Filter by comma-separated tags
 */
router.get('/', getMedia);

/**
 * @route   GET /api/media/stats
 * @desc    Get user media statistics and analytics
 * @access  Private
 */
router.get('/stats', getMediaStats);

/**
 * @route   PUT /api/media/:id
 * @desc    Update media metadata
 * @access  Private
 * @param   {string} id - Media document ID
 * @body    {number} [duration] - Display duration for images (1-300 seconds)
 * @body    {string} [tags] - Comma-separated tags
 * @body    {string} [description] - File description (max 500 chars)
 */
router.put('/:id', updateMedia);

/**
 * @route   DELETE /api/media/:id
 * @desc    Delete media file (from both database and Cloudinary)
 * @access  Private
 * @param   {string} id - Media document ID
 */
router.delete('/:id', deleteMedia);

/**
 * @route   GET /api/media/:id/download
 * @desc    Generate secure time-limited download URL
 * @access  Private
 * @param   {string} id - Media document ID
 */
router.get('/:id/download', generateDownloadUrl);

/**
 * @route   POST /api/media/:id/thumbnail
 * @desc    Generate thumbnail for video
 * @access  Private
 * @param   {string} id - Video media document ID
 * @body    {number} [width=400] - Thumbnail width
 * @body    {number} [height=300] - Thumbnail height
 * @body    {string} [start_offset=0] - Time offset for thumbnail generation
 */
router.post('/:id/thumbnail', createVideoThumbnail);

/**
 * @route   GET /api/media/health/check
 * @desc    Health check for media service
 * @access  Private
 */
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Media service is healthy',
    timestamp: new Date().toISOString(),
    service: 'media-upload',
    version: '1.0.0'
  });
});

/**
 * Error handling middleware specific to media routes
 */
router.use((error, req, res, next) => {
  // Handle Cloudinary-specific errors
  if (error.name === 'CloudinaryError') {
    return res.status(400).json({
      success: false,
      message: 'Cloud storage error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Storage service unavailable'
    });
  }

  // Handle file validation errors
  if (error.message && error.message.includes('file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Pass other errors to global error handler
  next(error);
});

module.exports = router;