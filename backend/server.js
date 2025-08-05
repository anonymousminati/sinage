/**
 * Multi-Screen Advertisement Platform Backend Server
 * Main server file with Express.js and Socket.IO setup
 * 
 * Features:
 * - Express.js REST API server
 * - Socket.IO real-time communication
 * - MongoDB database connection
 * - Comprehensive security middleware
 * - JWT authentication system
 * - Error handling and logging
 * - Cloudinary media storage integration
 */

require('dotenv').config();

// Core dependencies
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const path = require('path');

// Database and configuration
const { connectDatabase } = require('./config/database');
const { verifyCloudinaryConnection } = require('./config/cloudinary');
const logger = require('./config/logger');

// Middleware
const {
  cors,
  helmet,
  // mongoSanitize, // temporarily disabled
  hpp,
  generalLimiter,
  requestLogger,
  securityHeaders,
  userAgentValidator,
  contentTypeValidator
} = require('./middleware/securityMiddleware');

const {
  globalErrorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  timeoutHandler,
  AppError
} = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const playlistRoutes = require('./routes/playlistRoutes');

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*"|| process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Global process error handlers
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Middleware Setup
 */

// Trust proxy (for proper IP detection behind reverse proxy)
app.set('trust proxy', 1);

// Request timeout
app.use(timeoutHandler(30000)); // 30 seconds

// Security middleware
app.use(helmet);
app.use(cors);
app.use(securityHeaders);
app.use(userAgentValidator);
app.use(contentTypeValidator);

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Cookie parsing
app.use(cookieParser());

// MongoDB sanitization - temporarily disabled due to compatibility issues
// app.use(mongoSanitize);

// HTTP Parameter Pollution protection
app.use(hpp);

/**
 * Health Check Endpoints
 */

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        cpu: process.cpuUsage()
      }
    };

    // Check if any service is unhealthy
    const isUnhealthy = healthStatus.services.database !== 'connected';
    
    res.status(isUnhealthy ? 503 : 200).json({
      success: !isUnhealthy,
      data: healthStatus
    });

  } catch (error) {
    logger.error('Health check failed:', {
      service: 'health-check',
      error: error.message
    });

    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API Routes
 */

// Mount authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);

// API root endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sinage Platform API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      screens: '/api/screens',
      media: '/api/media',
      playlists: '/api/playlists',
      display: '/api/display'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Socket.IO Configuration
 */

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token using our auth utilities
    const { verifyAccessToken } = require('./utils/tokenUtils');
    const User = require('./models/User');
    
    // Handle both Bearer token and raw token formats
    const cleanToken = token.startsWith('Bearer ') ? token.replace('Bearer ', '') : token;
    const decoded = verifyAccessToken(cleanToken);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return next(new Error('Invalid user'));
    }

    socket.userId = user._id.toString();
    socket.userRole = user.role;
    socket.userEmail = user.email;
    
    logger.info('Socket.IO user connected:', {
      service: 'socket',
      userId: user._id,
      email: user.email,
      socketId: socket.id
    });

    next();
  } catch (error) {
    logger.warn('Socket.IO authentication failed:', {
      service: 'socket',
      error: error.message,
      socketId: socket.id,
      tokenPresent: !!token,
      tokenStart: token ? token.substring(0, 20) + '...' : 'none'
    });
    
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Socket.IO client connected:', {
    service: 'socket',
    socketId: socket.id,
    userId: socket.userId,
    userRole: socket.userRole
  });

  // Join user-specific room
  socket.join(`user:${socket.userId}`);
  
  // Join role-specific room
  socket.join(`role:${socket.userRole}`);

  // Handle screen registration (for display clients)
  socket.on('register-screen', async (data) => {
    try {
      const { screenId, location, resolution } = data;
      
      // Join screen-specific room
      socket.join(`screen:${screenId}`);
      
      // Emit screen online status to all users
      io.to('role:admin').emit('screen-status', {
        screenId,
        status: 'online',
        timestamp: new Date().toISOString(),
        location,
        resolution
      });

      logger.info('Screen registered:', {
        service: 'socket',
        screenId,
        socketId: socket.id,
        location,
        resolution
      });

      socket.emit('registration-confirmed', {
        success: true,
        screenId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Screen registration error:', {
        service: 'socket',
        error: error.message,
        socketId: socket.id,
        data
      });

      socket.emit('registration-error', {
        success: false,
        message: 'Screen registration failed',
        error: error.message
      });
    }
  });

  // Handle screen status updates
  socket.on('screen-status', (data) => {
    const { screenId, status, message } = data;
    
    // Broadcast status to all users
    io.to('role:admin').to('role:user').emit('screen-status', {
      screenId,
      status,
      message,
      timestamp: new Date().toISOString()
    });

    logger.info('Screen status update:', {
      service: 'socket',
      screenId,
      status,
      message,
      socketId: socket.id
    });
  });

  // ============================
  // Playlist Collaboration Events
  // ============================

  // Handle playlist room management
  socket.on('join:playlist', ({ playlistId }) => {
    socket.join(`playlist:${playlistId}`);
    socket.emit('joined:playlist', { playlistId, userId: socket.userId });
    
    // Notify other users in the playlist room
    socket.to(`playlist:${playlistId}`).emit('user:joined:playlist', {
      userId: socket.userId,
      userEmail: socket.userEmail,
      playlistId,
      timestamp: new Date().toISOString()
    });

    logger.info('User joined playlist room:', {
      service: 'socket',
      playlistId,
      userId: socket.userId,
      socketId: socket.id
    });
  });

  socket.on('leave:playlist', ({ playlistId }) => {
    socket.leave(`playlist:${playlistId}`);
    
    // Notify other users in the playlist room
    socket.to(`playlist:${playlistId}`).emit('user:left:playlist', {
      userId: socket.userId,
      userEmail: socket.userEmail,
      playlistId,
      timestamp: new Date().toISOString()
    });

    logger.info('User left playlist room:', {
      service: 'socket',
      playlistId,
      userId: socket.userId,
      socketId: socket.id
    });
  });

  // Handle playlist update events
  socket.on('playlist:update', (data) => {
    const { playlistId, data: updateData, timestamp } = data;
    
    // Broadcast to all users in the playlist room except the sender
    socket.to(`playlist:${playlistId}`).emit('playlist:updated', {
      playlistId,
      playlist: updateData,
      updatedBy: socket.userId,
      updatedByEmail: socket.userEmail,
      timestamp,
      changeType: 'metadata'
    });

    logger.info('Playlist metadata update:', {
      service: 'socket',
      playlistId,
      updatedBy: socket.userId,
      timestamp
    });
  });

  // Handle playlist item addition
  socket.on('playlist:item:add', (data) => {
    const { playlistId, item, position, timestamp } = data;
    
    socket.to(`playlist:${playlistId}`).emit('playlist:item:added', {
      playlistId,
      item,
      position,
      updatedBy: socket.userId,
      updatedByEmail: socket.userEmail,
      timestamp
    });

    logger.info('Playlist item added:', {
      service: 'socket',
      playlistId,
      itemId: item.id,
      position,
      updatedBy: socket.userId
    });
  });

  // Handle playlist item removal
  socket.on('playlist:item:remove', (data) => {
    const { playlistId, itemId, timestamp } = data;
    
    socket.to(`playlist:${playlistId}`).emit('playlist:item:removed', {
      playlistId,
      itemId,
      removedBy: socket.userId,
      removedByEmail: socket.userEmail,
      timestamp
    });

    logger.info('Playlist item removed:', {
      service: 'socket',
      playlistId,
      itemId,
      removedBy: socket.userId
    });
  });

  // Handle playlist item reordering
  socket.on('playlist:item:reorder', (data) => {
    const { playlistId, items, timestamp } = data;
    
    socket.to(`playlist:${playlistId}`).emit('playlist:item:reordered', {
      playlistId,
      items,
      updatedBy: socket.userId,
      updatedByEmail: socket.userEmail,
      timestamp
    });

    logger.info('Playlist items reordered:', {
      service: 'socket',
      playlistId,
      itemCount: items.length,
      updatedBy: socket.userId
    });
  });

  // Handle playlist screen assignment
  socket.on('playlist:assign', (data) => {
    const { playlistId, screenIds, timestamp } = data;
    
    // Notify playlist room users
    socket.to(`playlist:${playlistId}`).emit('playlist:assigned', {
      playlistId,
      screenIds,
      assignedBy: socket.userId,
      assignedByEmail: socket.userEmail,
      timestamp
    });

    // Notify affected screens
    screenIds.forEach(screenId => {
      io.to(`screen:${screenId}`).emit('playlist:assignment:changed', {
        playlistId,
        action: 'assigned',
        timestamp
      });
    });

    // Notify all dashboard users
    io.to('role:admin').to('role:user').emit('playlist:assigned', {
      playlistId,
      screenIds,
      assignedBy: socket.userId,
      assignedByEmail: socket.userEmail,
      timestamp
    });

    logger.info('Playlist assigned to screens:', {
      service: 'socket',
      playlistId,
      screenIds,
      assignedBy: socket.userId
    });
  });

  // Handle playlist screen unassignment
  socket.on('playlist:unassign', (data) => {
    const { playlistId, screenIds, timestamp } = data;
    
    // Notify playlist room users
    socket.to(`playlist:${playlistId}`).emit('playlist:unassigned', {
      playlistId,
      screenIds,
      unassignedBy: socket.userId,
      unassignedByEmail: socket.userEmail,
      timestamp
    });

    // Notify affected screens
    screenIds.forEach(screenId => {
      io.to(`screen:${screenId}`).emit('playlist:assignment:changed', {
        playlistId,
        action: 'unassigned',
        timestamp
      });
    });

    // Notify all dashboard users
    io.to('role:admin').to('role:user').emit('playlist:unassigned', {
      playlistId,
      screenIds,
      unassignedBy: socket.userId,
      unassignedByEmail: socket.userEmail,
      timestamp
    });

    logger.info('Playlist unassigned from screens:', {
      service: 'socket',
      playlistId,
      screenIds,
      unassignedBy: socket.userId
    });
  });

  // ============================
  // Media Library Events
  // ============================

  // Handle media upload notification
  socket.on('media:upload', (data) => {
    const { media, timestamp } = data;
    
    // Notify all users except the uploader
    socket.to(`user:${socket.userId}`).emit('media:uploaded', {
      mediaId: media.id,
      media,
      uploadedBy: socket.userId,
      uploadedByEmail: socket.userEmail,
      timestamp,
      action: 'uploaded'
    });

    logger.info('Media uploaded:', {
      service: 'socket',
      mediaId: media.id,
      uploadedBy: socket.userId,
      fileType: media.type
    });
  });

  // Handle media deletion notification
  socket.on('media:delete', (data) => {
    const { mediaId, timestamp } = data;
    
    // Notify all users except the deleter
    socket.to('role:admin').to('role:user').emit('media:deleted', {
      mediaId,
      deletedBy: socket.userId,
      deletedByEmail: socket.userEmail,
      timestamp,
      action: 'deleted'
    });

    logger.info('Media deleted:', {
      service: 'socket',
      mediaId,
      deletedBy: socket.userId
    });
  });

  // Handle media update notification
  socket.on('media:update', (data) => {
    const { mediaId, data: updateData, timestamp } = data;
    
    // Notify all users except the updater
    socket.to('role:admin').to('role:user').emit('media:updated', {
      mediaId,
      media: updateData,
      updatedBy: socket.userId,
      updatedByEmail: socket.userEmail,
      timestamp,
      action: 'updated'
    });

    logger.info('Media updated:', {
      service: 'socket',
      mediaId,
      updatedBy: socket.userId
    });
  });

  // Handle playlist updates for screens
  socket.on('playlist-update', (data) => {
    const { screenId, playlistId, action } = data;
    
    // Send playlist update to specific screen
    io.to(`screen:${screenId}`).emit('playlist-update', {
      playlistId,
      action,
      timestamp: new Date().toISOString()
    });

    logger.info('Screen playlist update:', {
      service: 'socket',
      screenId,
      playlistId,
      action,
      userId: socket.userId
    });
  });

  // Handle emergency controls
  socket.on('emergency-control', (data) => {
    const { screenId, action, message } = data;
    
    // Only allow admin users to send emergency controls
    if (socket.userRole !== 'admin') {
      socket.emit('error', {
        message: 'Insufficient permissions for emergency control'
      });
      return;
    }

    // Send emergency control to specific screen or all screens
    const target = screenId ? `screen:${screenId}` : 'role:screen';
    io.to(target).emit('emergency-control', {
      action,
      message,
      timestamp: new Date().toISOString()
    });

    logger.warn('Emergency control issued:', {
      service: 'socket',
      screenId: screenId || 'all',
      action,
      message,
      adminId: socket.userId
    });
  });

  // Handle screen heartbeat
  socket.on('heartbeat', (data) => {
    const { screenId } = data;
    
    socket.emit('heartbeat-ack', {
      timestamp: new Date().toISOString()
    });

    // Update screen last seen timestamp
    io.to('role:admin').emit('screen-heartbeat', {
      screenId,
      timestamp: new Date().toISOString()
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info('Socket.IO client disconnected:', {
      service: 'socket',
      socketId: socket.id,
      userId: socket.userId,
      reason
    });

    // If this was a screen connection, notify users
    socket.rooms.forEach(room => {
      if (room.startsWith('screen:')) {
        const screenId = room.replace('screen:', '');
        io.to('role:admin').emit('screen-status', {
          screenId,
          status: 'offline',
          timestamp: new Date().toISOString(),
          reason
        });
      }
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket.IO error:', {
      service: 'socket',
      error: error.message,
      socketId: socket.id,
      userId: socket.userId
    });
  });
});

/**
 * Error Handling
 */

// Handle 404 for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

/**
 * Server Startup
 */

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Verify Cloudinary connection
    await verifyCloudinaryConnection();
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Server started successfully`, {
        service: 'server',
        port: PORT,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
      
      console.log(`
🚀 Sinage Platform Backend Server Started
📍 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
🔗 API: http://localhost:${PORT}/api
💻 Health Check: http://localhost:${PORT}/health
📧 Socket.IO: Enabled
🛡️  Security: Enabled
📝 Logging: Active
      `);
    });

  } catch (error) {
    logger.error('Server startup failed:', {
      service: 'server',
      error: error.message,
      stack: error.stack
    });
    
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`, {
    service: 'server'
  });

  // Close server
  server.close(() => {
    logger.info('HTTP server closed', { service: 'server' });
    
    // Close database connection
    const mongoose = require('mongoose');
    mongoose.connection.close(() => {
      logger.info('Database connection closed', { service: 'server' });
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.warn('Forcing server shutdown', { service: 'server' });
    process.exit(1);
  }, 10000);
}

// Export for testing
module.exports = { app, server, io };

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}