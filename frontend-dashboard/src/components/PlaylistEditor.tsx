"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui/resizable";
import { PlaylistTimeline } from "./PlaylistTimeline";
import { PlaylistPreview } from "./PlaylistPreview";
import { PlaylistAssignment } from "./PlaylistAssignment";
import { PlaylistSettings } from "./PlaylistSettings";
import { ConflictResolutionDialog } from "./ConflictResolutionDialog";
import { 
  Search, 
  Plus, 
  Play, 
  Pause, 
  Save, 
  Copy, 
  Trash2, 
  Clock, 
  Monitor, 
  Image, 
  Video, 
  FileText,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Store imports
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { useMediaStore } from '../stores/useMediaStore';
import { socketService } from '../services/socketService';
import { useSocketStatus } from '../hooks/useSocketStatus';
import type { Playlist, PlaylistItem, MediaItem } from '../types';

// Component for individual sortable playlist items
interface SortablePlaylistItemProps {
  item: PlaylistItem;
  isSelected: boolean;
  onSelect: (item: PlaylistItem) => void;
  onRemove: (itemId: string) => void;
}

function SortablePlaylistItem({ item, isSelected, onSelect, onRemove }: SortablePlaylistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `playlist-item-${item.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-card border rounded-lg transition-colors group ${
        isSelected ? 'ring-2 ring-primary ring-opacity-50' : 'hover:bg-muted/50'
      }`}
      onClick={() => onSelect(item)}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg width="12" height="20" viewBox="0 0 12 20" className="text-current">
          <circle cx="4" cy="4" r="1" fill="currentColor" />
          <circle cx="8" cy="4" r="1" fill="currentColor" />
          <circle cx="4" cy="10" r="1" fill="currentColor" />
          <circle cx="8" cy="10" r="1" fill="currentColor" />
          <circle cx="4" cy="16" r="1" fill="currentColor" />
          <circle cx="8" cy="16" r="1" fill="currentColor" />
        </svg>
      </div>
      
      <div className="w-12 h-12 rounded border overflow-hidden bg-muted flex-shrink-0">
        <img
          src={item.media?.secureUrl || item.media?.url}
          alt={item.media?.originalName || 'Media item'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getFileIcon(item.media?.type || 'image')}
          <p className="font-medium text-sm truncate">{item.media?.originalName}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDuration(item.duration || item.media?.duration || 0)}</span>
          {item.media?.tags && item.media.tags.length > 0 && (
            <>
              <span>•</span>
              <span className="truncate">{item.media.tags.slice(0, 2).join(', ')}</span>
            </>
          )}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PlaylistEditor() {
  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showPreview, setShowPreview] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlaylistItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Socket connection status
  const socketStatus = useSocketStatus();

  // Store subscriptions
  const { 
    playlists, 
    currentPlaylist, 
    loading, 
    error,
    fetchPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    duplicatePlaylist,
    setCurrentPlaylist,
    addMediaToPlaylist,
    removeFromPlaylist,
    reorderPlaylistItems,
    clearError,
    initializeSocket,
    subscribeToPlaylistEvents,
    unsubscribeFromPlaylistEvents,
    activeUsers,
    conflictResolution,
    handleConflictResolution,
    clearConflict
  } = usePlaylistStore();

  const {
    media: mediaLibrary,
    loading: mediaLoading,
    error: mediaError,
    fetchMedia,
    clearError: clearMediaError,
    initializeSocket: initializeMediaSocket
  } = useMediaStore();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchPlaylists(),
          fetchMedia()
        ]);
      } catch (error) {
        console.error('Failed to initialize playlist editor:', error);
      }
    };

    initializeData();
  }, [fetchPlaylists, fetchMedia]);

  // Set first playlist as current if none selected
  useEffect(() => {
    if (playlists.length > 0 && !currentPlaylist) {
      setCurrentPlaylist(playlists[0]);
    }
  }, [playlists, currentPlaylist, setCurrentPlaylist]);

  // Initialize socket connections for real-time updates
  useEffect(() => {
    const initializeSockets = async () => {
      try {
        await Promise.all([
          initializeSocket(),
          initializeMediaSocket()
        ]);
        console.log('Socket connections initialized for PlaylistEditor');
      } catch (error) {
        console.error('Failed to initialize socket connections:', error);
        toast.error('Failed to connect to real-time service');
      }
    };

    initializeSockets();
  }, [initializeSocket, initializeMediaSocket]);

  // Subscribe to playlist room when current playlist changes
  useEffect(() => {
    if (currentPlaylist) {
      subscribeToPlaylistEvents(currentPlaylist.id);
      
      return () => {
        unsubscribeFromPlaylistEvents(currentPlaylist.id);
      };
    }
  }, [currentPlaylist, subscribeToPlaylistEvents, unsubscribeFromPlaylistEvents]);

  // Handle conflict resolution notifications
  useEffect(() => {
    if (conflictResolution.hasConflict && !showConflictDialog) {
      setShowConflictDialog(true);
      toast.warning(
        `Playlist modified by ${conflictResolution.conflictingUserEmail}. Please resolve the conflict.`,
        {
          duration: 10000,
          action: {
            label: 'Resolve',
            onClick: () => {
              setShowConflictDialog(true);
            },
          },
        }
      );
    }
  }, [conflictResolution, showConflictDialog]);

  // Connection status monitoring
  useEffect(() => {
    if (!socketStatus.connected && !socketStatus.connecting && socketStatus.reconnectAttempts > 0) {
      toast.error('Lost connection to real-time service');
    } else if (socketStatus.connected && socketStatus.reconnectAttempts > 0) {
      toast.success('Reconnected to real-time service');
    }
  }, [socketStatus]);

  // Filtered media based on search and type
  const filteredMedia = useMemo(() => {
    return mediaLibrary.filter(item => {
      const matchesSearch = item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [mediaLibrary, searchQuery, typeFilter]);

  // Utility functions
  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getFileIcon = useCallback((type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  }, []);

  // Event handlers
  const handleAddMediaToPlaylist = useCallback(async (mediaId: string, position?: number) => {
    if (!currentPlaylist) {
      console.warn('No current playlist selected');
      return;
    }
    
    try {
      await addMediaToPlaylist(currentPlaylist.id, mediaId, position);
      toast.success("Media added to playlist");
    } catch (error) {
      console.error('Failed to add media to playlist:', error);
      toast.error("Failed to add media to playlist");
    }
  }, [currentPlaylist, addMediaToPlaylist]);

  const handleRemoveFromPlaylist = useCallback(async (itemId: string) => {
    if (!currentPlaylist) return;
    
    try {
      await removeFromPlaylist(currentPlaylist.id, itemId);
      toast.success("Item removed from playlist");
      
      // Clear selection if removed item was selected
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
      toast.error("Failed to remove item");
    }
  }, [currentPlaylist, removeFromPlaylist, selectedItem]);

  const handleReorderItems = useCallback(async (newItems: PlaylistItem[]) => {
    if (!currentPlaylist) return;
    
    try {
      await reorderPlaylistItems(currentPlaylist.id, newItems);
      toast.success("Items reordered");
    } catch (error) {
      console.error('Failed to reorder items:', error);
      toast.error("Failed to reorder items");
    }
  }, [currentPlaylist, reorderPlaylistItems]);

  const handleDuplicatePlaylist = useCallback(async () => {
    if (!currentPlaylist) return;
    
    try {
      const duplicated = await duplicatePlaylist(currentPlaylist.id);
      if (duplicated) {
        setCurrentPlaylist(duplicated);
        toast.success("Playlist duplicated");
      }
    } catch (error) {
      console.error('Failed to duplicate playlist:', error);
      toast.error("Failed to duplicate playlist");
    }
  }, [currentPlaylist, duplicatePlaylist, setCurrentPlaylist]);

  const handleCreateNewPlaylist = useCallback(async () => {
    try {
      const newPlaylist = await createPlaylist({
        name: `New Playlist ${playlists.length + 1}`,
        description: 'A new playlist',
        isActive: true
      });
      
      if (newPlaylist) {
        setCurrentPlaylist(newPlaylist);
        toast.success("New playlist created");
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
      toast.error("Failed to create playlist");
    }
  }, [createPlaylist, playlists.length, setCurrentPlaylist]);

  const handleSavePlaylist = useCallback(async () => {
    if (!currentPlaylist) return;
    
    try {
      await updatePlaylist(currentPlaylist.id, {
        name: currentPlaylist.name,
        description: currentPlaylist.description,
        isActive: currentPlaylist.isActive
      });
      toast.success("Playlist saved");
    } catch (error) {
      console.error('Failed to save playlist:', error);
      toast.error("Failed to save playlist");
    }
  }, [currentPlaylist, updatePlaylist]);

  const handleAssignToScreens = useCallback(async (screenIds: string[]) => {
    if (!currentPlaylist) return;
    
    try {
      // This would be implemented when screen assignment is needed
      toast.success(`Playlist assigned to ${screenIds.length} screens`);
    } catch (error) {
      console.error('Failed to assign playlist:', error);
      toast.error("Failed to assign playlist");
    }
  }, [currentPlaylist]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Handle media item dropped to playlist
    if (activeId.startsWith('media-') && overId === 'playlist-drop-zone') {
      const mediaId = activeId.replace('media-', '');
      await handleAddMediaToPlaylist(mediaId);
      return;
    }

    // Handle playlist item reordering
    if (activeId.startsWith('playlist-item-') && overId.startsWith('playlist-item-') && currentPlaylist) {
      const items = [...currentPlaylist.items];
      const activeIndex = items.findIndex(item => `playlist-item-${item.id}` === activeId);
      const overIndex = items.findIndex(item => `playlist-item-${item.id}` === overId);

      if (activeIndex !== overIndex) {
        const newItems = arrayMove(items, activeIndex, overIndex).map((item, index) => ({
          ...item,
          order: index
        }));
        await handleReorderItems(newItems);
      }
    }
  }, [currentPlaylist, handleAddMediaToPlaylist, handleReorderItems]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over logic if needed
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S - Save playlist
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSavePlaylist();
      }
      // Delete key - Remove selected item
      if (e.key === 'Delete' && selectedItem) {
        handleRemoveFromPlaylist(selectedItem.id);
      }
      // Ctrl+D - Duplicate playlist
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handleDuplicatePlaylist();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, handleSavePlaylist, handleRemoveFromPlaylist, handleDuplicatePlaylist]);

  // Clear errors on mount
  useEffect(() => {
    return () => {
      clearError();
      clearMediaError();
    };
  }, [clearError, clearMediaError]);

  // Show loading state
  if (loading || mediaLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading playlists...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || mediaError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || mediaError}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold">Playlist Editor</h1>
              
              {/* Connection Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  socketStatus.isConnected 
                    ? 'bg-green-500 animate-pulse' 
                    : socketStatus.isConnecting || socketStatus.isReconnecting
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }`} />
                <span className="text-xs text-muted-foreground">
                  {socketStatus.isConnected 
                    ? 'Live' 
                    : socketStatus.isConnecting || socketStatus.isReconnecting
                    ? 'Connecting...'
                    : 'Offline'}
                </span>
              </div>

              {/* Active Users */}
              {currentPlaylist && activeUsers[currentPlaylist.id] && activeUsers[currentPlaylist.id].length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {activeUsers[currentPlaylist.id].length} user{activeUsers[currentPlaylist.id].length !== 1 ? 's' : ''} active
                  </span>
                </div>
              )}

              {/* Conflict Indicator */}
              {conflictResolution.hasConflict && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">Conflict</span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground">Create and manage content playlists for your displays</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)} disabled={!currentPlaylist}>
              <Play className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" onClick={() => setShowAssignment(true)} disabled={!currentPlaylist}>
              <Monitor className="h-4 w-4 mr-2" />
              Assign to Screens
            </Button>
            <Button onClick={handleSavePlaylist} disabled={!currentPlaylist}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>

        {/* Playlist Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select 
                  value={currentPlaylist?.id || ""} 
                  onValueChange={playlistId => {
                    const playlist = playlists.find(p => p.id === playlistId);
                    if (playlist) setCurrentPlaylist(playlist);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a playlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {playlists.map(playlist => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{playlist.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-4">
                            <span>{playlist.items.length} items</span>
                            <span>•</span>
                            <span>{formatDuration(playlist.totalDuration)}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentPlaylist && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(currentPlaylist.totalDuration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      <span>{currentPlaylist.assignedScreens.length} screens</span>
                    </div>
                    <Badge variant={currentPlaylist.isActive ? "default" : "secondary"}>
                      {currentPlaylist.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDuplicatePlaylist} disabled={!currentPlaylist}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={handleCreateNewPlaylist}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Playlist
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Editor */}
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
          {/* Media Library Panel */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Media Library</h3>
                <Badge variant="outline">{filteredMedia.length} items</Badge>
              </div>

              {/* Search and Filters */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="mb-4" />

              {/* Media Items */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredMedia.map(item => (
                  <div
                    key={item._id}
                    id={`media-${item._id}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', `media-${item._id}`);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-grab hover:bg-muted/50 active:cursor-grabbing transition-colors group"
                  >
                    <div className="w-12 h-12 rounded border overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={item.secureUrl || item.url}
                        alt={item.originalName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getFileIcon(item.type)}
                        <p className="font-medium text-sm truncate">{item.originalName}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.duration && (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(item.duration)}</span>
                          </>
                        )}
                        {item.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="truncate">{item.tags.slice(0, 2).join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredMedia.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>No media files found</p>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Playlist Editor Panel */}
          <ResizablePanel defaultSize={65} minSize={50}>
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {currentPlaylist?.name || "Select a playlist"}
                </h3>
                {currentPlaylist && (
                  <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                )}
              </div>

              {currentPlaylist ? (
                <div className="flex-1 flex flex-col">
                  {/* Drop Zone */}
                  <div
                    id="playlist-drop-zone"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const mediaId = e.dataTransfer.getData('text/plain');
                      if (mediaId.startsWith('media-')) {
                        handleAddMediaToPlaylist(mediaId.replace('media-', ''));
                      }
                    }}
                    className={`flex-1 border-2 border-dashed rounded-lg p-4 transition-colors ${
                      activeId && activeId.startsWith('media-') 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25'
                    }`}
                  >
                    {currentPlaylist.items.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center">
                        <div>
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h4 className="font-medium mb-2">Empty Playlist</h4>
                          <p className="text-sm text-muted-foreground">
                            Drag media files from the library to add them to this playlist
                          </p>
                        </div>
                      </div>
                    ) : (
                      <SortableContext 
                        items={currentPlaylist.items.map(item => `playlist-item-${item.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {currentPlaylist.items.map((item, index) => (
                            <SortablePlaylistItem
                              key={item.id}
                              item={item}
                              isSelected={selectedItem?.id === item.id}
                              onSelect={setSelectedItem}
                              onRemove={handleRemoveFromPlaylist}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>

                  {/* Timeline */}
                  {currentPlaylist.items.length > 0 && (
                    <div className="mt-4">
                      <PlaylistTimeline 
                        playlist={currentPlaylist}
                        onSeek={(time) => {
                          // Handle timeline seek if needed
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-medium mb-2">No Playlist Selected</h4>
                    <p className="text-sm text-muted-foreground">
                      Select a playlist from the dropdown above to start editing
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && activeId.startsWith('media-') ? (
            (() => {
              const mediaId = activeId.replace('media-', '');
              const mediaItem = mediaLibrary.find(item => item._id === mediaId);
              return mediaItem ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-background shadow-lg opacity-80">
                  <div className="w-12 h-12 rounded border overflow-hidden bg-muted">
                    <img
                      src={mediaItem.secureUrl || mediaItem.url}
                      alt={mediaItem.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{mediaItem.originalName}</p>
                  </div>
                </div>
              ) : null;
            })()
          ) : activeId && activeId.startsWith('playlist-item-') ? (
            (() => {
              const itemId = activeId.replace('playlist-item-', '');
              const playlistItem = currentPlaylist?.items.find(item => item.id === itemId);
              return playlistItem ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-background shadow-lg opacity-80">
                  <div className="w-12 h-12 rounded border overflow-hidden bg-muted">
                    <img
                      src={playlistItem.media?.secureUrl || playlistItem.media?.url}
                      alt={playlistItem.media?.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{playlistItem.media?.originalName}</p>
                  </div>
                </div>
              ) : null;
            })()
          ) : null}
        </DragOverlay>

        {/* Modals */}
        <PlaylistPreview
          playlist={currentPlaylist}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />

        <PlaylistAssignment
          playlist={currentPlaylist}
          isOpen={showAssignment}
          onClose={() => setShowAssignment(false)}
          onAssign={handleAssignToScreens}
        />

        <PlaylistSettings
          playlist={currentPlaylist}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {/* Conflict Resolution Dialog */}
        <ConflictResolutionDialog
          isOpen={showConflictDialog}
          onClose={() => {
            setShowConflictDialog(false);
            clearConflict();
          }}
          conflictData={conflictResolution}
          onResolve={(resolution) => {
            handleConflictResolution(resolution);
            setShowConflictDialog(false);
          }}
        />
      </div>
    </DndContext>
  );
}