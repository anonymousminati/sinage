# Sinage Platform Backend API

A comprehensive Node.js backend server for a multi-screen advertisement platform with real-time communication capabilities.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Real-time Communication**: Socket.IO for live screen status and playlist updates
- **Media Management**: Cloudinary integration for image and video storage
- **Security**: Comprehensive security middleware with rate limiting
- **Database**: MongoDB with Mongoose ODM
- **Logging**: Structured logging with Winston
- **Error Handling**: Centralized error handling with custom error classes
- **Validation**: Input validation with express-validator
- **API Documentation**: RESTful API design with proper HTTP status codes

## 📋 Prerequisites

- Node.js (v18.0.0 or higher)
- MongoDB Atlas account or local MongoDB instance
- Cloudinary account for media storage
- Email service for password reset (optional)

## 🛠️ Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configurations:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sinage_db
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_SECRET=your-refresh-secret
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Password Configuration
   SALT_ROUNDS=12
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 📁 Project Structure

```
backend/
├── config/                 # Configuration files
│   ├── database.js         # MongoDB connection
│   ├── cloudinary.js       # Cloudinary setup
│   └── logger.js           # Winston logger
├── controllers/            # Business logic
│   └── authController.js   # Authentication controllers
├── middleware/             # Express middleware
│   ├── authMiddleware.js   # JWT verification
│   ├── securityMiddleware.js # Security measures
│   └── errorHandler.js     # Error handling
├── models/                 # Mongoose schemas
│   └── User.js            # User model
├── routes/                 # API routes
│   └── authRoutes.js      # Authentication routes
├── services/               # Business services
├── utils/                  # Utility functions
│   ├── tokenUtils.js      # JWT utilities
│   └── validators.js      # Input validation
├── server.js              # Main server file
├── package.json           # Dependencies
└── .env.example          # Environment template
```

## 🔐 Authentication System

### Registration Flow
1. User submits registration form
2. Password is hashed with bcrypt (12 salt rounds)
3. Email verification token is generated
4. User account is created (unverified)
5. Verification email is sent (in production)

### Login Flow
1. User submits email/password
2. Credentials are verified
3. Account lock status is checked
4. JWT tokens are generated (access + refresh)
5. Tokens are set as HTTP-only cookies
6. Login history is recorded

### Security Features
- Password complexity requirements
- Account lockout after 5 failed attempts
- Rate limiting on auth endpoints
- JWT token rotation
- Session management
- Request logging

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | Yes |
| POST | `/refresh-token` | Refresh access token | No |
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |
| GET | `/verify/:token` | Verify email address | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password | No |
| GET | `/validate-token` | Validate current token | Yes |
| POST | `/resend-verification` | Resend verification email | Yes |
| GET | `/session-info` | Get session information | Yes |
| GET | `/users` | Get all users (admin) | Yes (Admin) |
| GET | `/stats` | Get user statistics (admin) | Yes (Admin) |

### Health Check Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed system health |

## 🔌 Socket.IO Events

### Client to Server Events

| Event | Description | Data |
|-------|-------------|------|
| `register-screen` | Register a display screen | `{screenId, location, resolution}` |
| `screen-status` | Update screen status | `{screenId, status, message}` |
| `playlist-update` | Update playlist on screen | `{screenId, playlistId, action}` |
| `emergency-control` | Emergency screen control | `{screenId, action, message}` |
| `heartbeat` | Screen heartbeat | `{screenId}` |

### Server to Client Events

| Event | Description | Data |
|-------|-------------|------|
| `registration-confirmed` | Screen registration success | `{success, screenId, timestamp}` |
| `screen-status` | Screen status update | `{screenId, status, timestamp}` |
| `playlist-update` | Playlist update notification | `{playlistId, action, timestamp}` |
| `emergency-control` | Emergency control command | `{action, message, timestamp}` |
| `heartbeat-ack` | Heartbeat acknowledgment | `{timestamp}` |

## 🛡️ Security Measures

### Rate Limiting
- Authentication endpoints: 5 attempts per 15 minutes
- General API: 100 requests per 15 minutes
- Password reset: 3 attempts per hour
- Registration: 3 attempts per hour

### Security Headers
- Helmet.js for security headers
- CORS configuration
- XSS protection
- Content Security Policy
- HTTP Parameter Pollution protection

### Input Validation
- MongoDB injection prevention
- Request sanitization
- File upload validation
- Input type checking

## 📊 Logging

The application uses Winston for structured logging:

- **Authentication events**: Login, logout, registration
- **Security events**: Rate limit violations, failed auth attempts
- **Database operations**: Connection status, query performance
- **API requests**: Method, URL, status code, response time
- **Socket.IO events**: Connections, disconnections, screen status

Log levels:
- `error`: System errors, exceptions
- `warn`: Security events, warnings
- `info`: General information, auth events
- `debug`: Detailed debugging information

## 🧪 Testing the API

### Using cURL

**Register a new user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }' \
  -c cookies.txt
```

**Get profile (with cookies):**
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Using Postman

1. Import the API endpoints
2. Set up environment variables for base URL
3. Use the authentication endpoints to get tokens
4. Add Bearer token to protected routes

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common error codes:
- `VALIDATION_ERROR`: Input validation failed
- `AUTH_REQUIRED`: Authentication required
- `INSUFFICIENT_PERMISSIONS`: Access denied
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `USER_NOT_FOUND`: User doesn't exist
- `INVALID_CREDENTIALS`: Wrong email/password

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiration | 24h |
| `SALT_ROUNDS` | Password hashing rounds | 12 |
| `FRONTEND_URL` | Frontend application URL | - |

### Database Indexes

The User model includes indexes for:
- `email` (unique)
- `role`
- `isVerified`
- `resetPasswordToken`
- `emailVerificationToken`
- `createdAt`

## 📈 Performance Considerations

- **Connection Pooling**: MongoDB connection pool (max 10 connections)
- **Request Timeout**: 30-second timeout for all requests
- **Memory Management**: Request size limited to 10MB
- **Caching**: Future implementation for frequently accessed data
- **Database Queries**: Optimized with proper indexing

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Configure reverse proxy (nginx)
6. Set up monitoring and logging

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [
    // Validation errors (if applicable)
  ]
}
```

## 🤝 Contributing

1. Follow the established code structure
2. Add proper error handling
3. Include input validation
4. Write comprehensive tests
5. Update documentation
6. Follow security best practices

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
1. Check the logs for detailed error information
2. Verify environment configuration
3. Ensure database connectivity
4. Check API documentation for proper usage

## 🔄 Next Steps

After setting up the authentication system:

1. **Create additional models**: Screen, Media, Playlist
2. **Implement file upload**: Multer + Cloudinary integration
3. **Add real-time features**: Screen management, playlist updates
4. **Create admin dashboard**: User management, analytics
5. **Implement cron jobs**: Cleanup tasks, health monitoring
6. **Add comprehensive testing**: Unit tests, integration tests
7. **Set up CI/CD**: Automated testing and deployment