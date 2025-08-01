# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-screen advertisement management platform consisting of three main components:

1. **Backend** (`backend/`) - Node.js/Express API server with MongoDB, JWT auth, Socket.IO real-time communication, and Cloudinary media storage
2. **Frontend Dashboard** (`frontend-dashboard/`) - React TypeScript dashboard for managing screens, media, and playlists
3. **Frontend Display** (planned) - Lightweight display application for physical screens

## Development Commands

### Frontend Dashboard (`frontend-dashboard/`)
```bash
# Development server
npm run dev

# Build for production  
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend (`backend/`)
Currently minimal setup - only contains package.json with basic structure.

## Architecture & Key Concepts

### Frontend Dashboard Architecture
- **Framework**: React 19 with TypeScript, Vite build tool
- **Styling**: Tailwind CSS v4 with comprehensive shadcn/ui component library
- **State Management**: Local component state (no global state management yet)
- **Navigation**: Client-side routing via state-based page switching in App.tsx
- **UI Components**: Complete shadcn/ui library in `src/components/ui/`

### Project Structure
```
frontend-dashboard/src/
├── components/
│   ├── ui/              # shadcn/ui components (Button, Dialog, etc.)
│   ├── figma/           # Custom components (ImageWithFallback)
│   ├── Dashboard.tsx    # Main dashboard page
│   ├── ScreenManagement.tsx
│   ├── MediaLibrary.tsx
│   ├── PlaylistEditor.tsx
│   └── RealTimeControl.tsx
├── styles/
│   └── globals.css      # Global styles
└── App.tsx             # Main app with client-side routing
```

### Key Features (Based on Project Plan)
- **User Authentication**: JWT-based auth system
- **Screen Management**: Add, monitor, and control display screens
- **Media Library**: Upload images/videos with Cloudinary integration
- **Playlist Management**: Drag-and-drop playlist creation and editing
- **Real-time Updates**: Socket.IO for live screen status and control
- **Multi-user Support**: User-specific data isolation

### Database Models (Planned)
- **User**: email, password, screens[]
- **Screen**: screenId, name, owner, currentPlaylist, status, lastSeen
- **Media**: url, type (image/video), duration, owner
- **Playlist**: name, media[] (ordered), owner

### Technology Stack
- **Frontend**: React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4
- **Backend**: Node.js, Express, MongoDB, Mongoose, JWT, Socket.IO
- **Media Storage**: Cloudinary with streaming uploads
- **Real-time**: Socket.IO for bi-directional communication
- **UI**: shadcn/ui component library

### Development Notes
- Frontend uses modern React patterns with hooks and functional components
- UI components follow shadcn/ui conventions with Tailwind styling
- Backend is planned but not yet implemented
- Real-time features planned for screen status updates and playlist changes
- Media uploads will stream directly to Cloudinary to avoid server storage