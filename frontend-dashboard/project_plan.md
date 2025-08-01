Project Plan: Multi-Screen Advertisement Dashboard (Detailed)
This document outlines the complete, detailed development plan for the multi-screen advertisement platform. It is broken down into three core components: the Backend, the Frontend Dashboard, and the Frontend Screen Display, with expanded explanations of architecture, logic, and implementation steps.

## 1. Backend (The Core API & Real-time Server)
This is the central nervous system of your application. It will handle all data, business logic, and real-time communication.

Directory: backend/

Technology Stack
Server: Node.js with Express.js

Database: MongoDB with Mongoose

Authentication: JSON Web Tokens (JWT)

Real-time: Socket.IO

Media Storage: Cloudinary (with streaming for efficiency)

Proposed Folder Structure
backend/
├── config/         # Database connection, environment variables
├── controllers/    # Business logic for each route
├── middleware/     # Authentication checks (e.g., verifyJWT)
├── models/         # Mongoose schemas (User, Screen, Media, Playlist)
├── routes/         # API endpoint definitions
└── server.js       # Main server file (Express + Socket.IO setup)

Database Models (Schema Details)
User (models/userModel.js):

email: { type: String, required: true, unique: true }

password: { type: String, required: true } (Will be hashed using bcrypt)

screens: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Screen' }]

Screen (models/screenModel.js):

screenId: { type: String, required: true, unique: true } (e.g., a short, unique code)

name: { type: String, required: true }

owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }

currentPlaylist: { type: mongoose.Schema.Types.ObjectId, ref: 'Playlist', default: null }

status: { type: String, enum: ['online', 'offline'], default: 'offline' }

lastSeen: { type: Date, default: Date.now }

Media (models/mediaModel.js):

url: { type: String, required: true } (URL from cloud storage)

type: { type: String, enum: ['image', 'video'], required: true }

duration: { type: Number, required: function() { return this.type === 'image'; } } (in seconds, required only for images)

owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }

Playlist (models/playlistModel.js):

name: { type: String, required: true }

media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }] (This is an ordered array)

owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }

Controller & Route Logic
User-Specific Data: Every protected route will use a verifyJWT middleware. This middleware decodes the token from the request header, finds the user's ID, and attaches it to the request object (e.g., req.userId). Controllers then use req.userId in their database queries (e.g., Playlist.find({ owner: req.userId })) to fetch data belonging only to that user.

Playlist Editing (controllers/playlistController.js):

The updatePlaylist function will receive a request to PUT /api/playlists/:id. The request body will contain the new, reordered array of Media ObjectIDs: { "media": ["mediaId1", "mediaId3", "mediaId2"] }. The controller will find the playlist by its ID, ensure its owner matches req.userId, then update the media field and save it.

Media Uploads (Cloudinary Best Practices):

Streaming: To handle large files efficiently without high memory usage, uploads will be streamed directly to Cloudinary. Use libraries like multer and multer-storage-cloudinary. The data flows from the client through the server to Cloudinary without being stored on the server's disk.

Implementation (controllers/mediaController.js):

Configure multer-storage-cloudinary with your Cloudinary credentials and desired upload options (folder, allowed formats).

The upload route will use multer as middleware. The controller logic will then only execute after the file has been successfully streamed and uploaded.

The controller receives the upload result from Cloudinary (containing url, type, etc.) via req.file.

It then creates a new Media document in the database with the URL and other metadata.

Error Handling & Edge Cases:

Invalid File Type: Configure multer to only accept specific file types (e.g., 'jpg', 'png', 'mp4'). If an invalid type is uploaded, multer will throw an error that should be caught and returned as a 400 Bad Request.

File Size Limit: Set a fileSize limit in multer's configuration. If a file exceeds this, a 413 Payload Too Large error should be returned.

Network Interruption: If the stream breaks, the library should emit an error. A global error-handling middleware in Express should catch this and respond with a 500 Internal Server Error.

Cloudinary API Errors: Wrap the upload logic in a try...catch block. If Cloudinary returns an error (e.g., invalid API key, storage limit reached), catch it and respond with an appropriate status code (e.g., 502 Bad Gateway).

Socket.IO Server Logic (server.js)
Event Handling:

on('join-user-room', (userId) => { socket.join(userId); })

on('join-screen-room', (screenId) => { ... }): Update screen status to 'online' and emit 'screen-status-changed' to the owner.

on('screen-heartbeat', (screenId) => { ... }): Update lastSeen. A node-cron job will periodically check for stale lastSeen timestamps to mark screens as offline.

on('update-playlist', ({ screenId, playlistId }) => { ... }): Update DB, then emit 'playlist-update' to the specific screenId room.

on('disconnect', () => { ... }): If the client was a screen, update its status to 'offline' and notify the owner.

## 2. Frontend Dashboard (The Control Panel)
This is the interactive React application for your users.

Directory: frontend-dashboard/

Technology Stack
Framework: React (Vite)

UI: Tailwind CSS

Routing: React Router (react-router-dom)

State Management: Zustand

API Calls: Axios

Drag & Drop: dnd-kit

Real-time Client: socket.io-client

Proposed Folder Structure
frontend-dashboard/
└── src/
    ├── api/            # Centralized Axios instance and API calls
    ├── components/     # Reusable UI components (Button, Modal, etc.)
    ├── context/        # Socket.IO context provider
    ├── features/       # Feature-based components (Screens, Playlists)
    ├── hooks/          # Custom hooks (e.g., useAuth)
    ├── pages/          # Top-level page components
    ├── routes/         # App routing configuration
    │   ├── ProtectedRoute.jsx
    │   └── AppRoutes.jsx
    └── store/          # Zustand state management stores

Routing (routes/)
AppRoutes.jsx: This file will define all public and private routes using react-router-dom.

ProtectedRoute.jsx: This component will wrap private routes. It will check for a valid authentication token (e.g., from the auth store). If the user is authenticated, it renders the child component (<Outlet />). If not, it redirects them to the /login page.

State Management (Zustand Best Practices)
Create Modular Stores (store/): Avoid a single monolithic store. Create separate stores for different concerns.

useAuthStore.js: Manages user info, token, and authentication status.

useScreenStore.js: Manages the list of screens, their statuses, and related actions.

usePlaylistStore.js: Manages playlists and media items.

Use Selectors for Performance: When accessing state in a component, use selectors to subscribe to only the specific pieces of state you need. This prevents the component from re-rendering when unrelated state changes.

Bad: const { screens, status } = useScreenStore(); (Re-renders if status changes, even if the component only uses screens).

Good: const screens = useScreenStore(state => state.screens); (Only re-renders if the screens array changes).

Define Actions Inside create: Keep your state update logic (actions) inside the store definition. This co-locates state and the methods that change it, making the code easier to reason about.

Component & Feature Breakdown
Media Library (features/media): When a user uploads an image, a modal will appear asking for the display duration. This value is sent along with the file to the backend.

Playlist Editor (features/playlists): Uses dnd-kit to drag, drop, and reorder items. The "Save" button sends the final, ordered array of media IDs to the backend.

Screen Manager (features/screens): Displays a list of screens from useScreenStore. Each screen item will have a status dot whose color is derived from the status field in the store.

Socket.IO Client Logic (context/SocketContext.js)
This context will establish the socket connection.

Event Listeners: on('screen-status-changed', ({ screenId, status }) => { ... }): It will call an action in the useScreenStore (e.g., setScreenStatus(screenId, status)) to update the state, causing the UI to re-render with the correct status dot.

## 3. Frontend Screen Display (The Player)
A lightweight, robust application that runs on the physical display hardware.

Directory: frontend-display/

Proposed Folder Structure
frontend-display/
└── src/
    ├── api/
    ├── components/
    │   └── Player.jsx
    ├── context/
    ├── pages/
    │   └── DisplayPage.jsx
    ├── routes/
    │   └── AppRoutes.jsx
    └── store/
        └── useDisplayStore.js

Core Logic & Flow
Initialization: On start, the app gets its screenId from a local config.json file or a URL query parameter. It connects to Socket.IO and emits 'join-screen-room' and starts the 'screen-heartbeat' interval.

Content Fetching: It calls GET /api/display/:screenId to get its playlist. The result is stored in a Zustand store (useDisplayStore).

Content Player (components/Player.js):

This component will manage the display loop. It will read the playlist from the useDisplayStore.

State: It uses a local state variable, currentItemIndex, to track its position in the playlist array.

Logic (useEffect hook):

If currentItem.type === 'image', it uses setTimeout with currentItem.duration to advance.

If currentItem.type === 'video', it uses the onEnded event to advance.

The % playlist.media.length ensures the playlist loops.

Socket.IO Client Logic:

on('playlist-update', () => { ... }): When this is received, it calls an action to re-fetch the playlist from the API and update the Zustand store. The Player component will automatically react to this state change, ensuring a smooth transition.