"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Monitor, 
  Search, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Clock, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Grid3X3,
  List,
  RotateCw,
  Users,
  Zap,
  MapPin
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import type { Playlist, ScreenAssignment, PlaylistItem, MediaItem } from "../types";

// Helper function to safely extract media data from playlist item
function extractMediaFromItem(item: PlaylistItem): MediaItem | null {
  if (!item) return null;
  
  // First try: populated mediaId (backend populates this directly)
  if (typeof item.mediaId === 'object' && item.mediaId !== null) {
    return item.mediaId as MediaItem;
  }
  
  // Second try: media property (fallback)
  if (item.media && typeof item.media === 'object') {
    return item.media;
  }
  
  // Third try: if mediaId is an object but not detected by typeof check
  if (item.mediaId && typeof item.mediaId !== 'string' && typeof item.mediaId !== 'undefined') {
    return item.mediaId as MediaItem;
  }
  
  return null;
}

interface Screen {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'connecting' | 'error' | 'maintenance';
  lastSeen: string;
  currentPlaylist?: string;
  currentPlaylistName?: string;
  resolution: string;
  orientation: 'landscape' | 'portrait';
  tags: string[];
  group?: string;
}

interface PlaylistAssignmentProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign?: (screenIds: string[]) => void;
  className?: string;
}

interface AssignmentFilters {
  search: string;
  status: 'all' | 'online' | 'offline' | 'available';
  group: string;
  orientation: 'all' | 'landscape' | 'portrait';
}

interface AssignmentConflict {
  screenId: string;
  screenName: string;
  currentPlaylist: string;
  currentPlaylistName: string;
}

// Mock screen data - in real app this would come from API/store
const mockScreens: Screen[] = [
  {
    id: "SCR-001",
    name: "Main Lobby Display",
    location: "Building A - Lobby",
    status: 'online',
    lastSeen: new Date(Date.now() - 30000).toISOString(),
    currentPlaylist: "playlist-1",
    currentPlaylistName: "Welcome Content",
    resolution: "1920x1080",
    orientation: 'landscape',
    tags: ['lobby', 'main', 'high-traffic'],
    group: 'Building A'
  },
  {
    id: "SCR-002",
    name: "Conference Room Alpha",
    location: "Building A - Floor 2",
    status: 'online',
    lastSeen: new Date(Date.now() - 120000).toISOString(),
    resolution: "3840x2160",
    orientation: 'landscape',
    tags: ['conference', 'meeting'],
    group: 'Building A'
  },
  {
    id: "SCR-003",
    name: "Cafeteria Menu Board",
    location: "Building B - Cafeteria",
    status: 'offline',
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    currentPlaylist: "playlist-2",
    currentPlaylistName: "Daily Menu",
    resolution: "1080x1920",
    orientation: 'portrait',
    tags: ['cafeteria', 'menu', 'food'],
    group: 'Building B'
  },
  {
    id: "SCR-004",
    name: "Reception Display",
    location: "Building A - Reception",
    status: 'connecting',
    lastSeen: new Date(Date.now() - 300000).toISOString(),
    resolution: "1920x1080",
    orientation: 'landscape',
    tags: ['reception', 'visitors'],
    group: 'Building A'
  },
  {
    id: "SCR-005",
    name: "Emergency Exit Board",
    location: "Building C - Emergency Exit",
    status: 'error',
    lastSeen: new Date(Date.now() - 1800000).toISOString(),
    resolution: "1280x720",
    orientation: 'landscape',
    tags: ['emergency', 'safety'],
    group: 'Building C'
  },
  {
    id: "SCR-006",
    name: "Elevator Display",
    location: "Building A - Elevator Bank",
    status: 'maintenance',
    lastSeen: new Date(Date.now() - 900000).toISOString(),
    resolution: "1080x1920",
    orientation: 'portrait',
    tags: ['elevator', 'information'],
    group: 'Building A'
  }
];

export function PlaylistAssignment({ 
  playlist, 
  isOpen, 
  onClose, 
  onAssign,
  className 
}: PlaylistAssignmentProps) {
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [filters, setFilters] = useState<AssignmentFilters>({
    search: '',
    status: 'all',
    group: 'all',
    orientation: 'all'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showConflicts, setShowConflicts] = useState(false);
  const [assignmentConflicts, setAssignmentConflicts] = useState<AssignmentConflict[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedScreens([]);
      setFilters({
        search: '',
        status: 'all',
        group: 'all',
        orientation: 'all'
      });
      setShowConflicts(false);
      setAssignmentConflicts([]);
    }
  }, [isOpen, playlist]);

  // Filter screens based on current filters
  const filteredScreens = useMemo(() => {
    return mockScreens.filter(screen => {
      const matchesSearch = screen.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                           screen.location.toLowerCase().includes(filters.search.toLowerCase()) ||
                           screen.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesStatus = filters.status === 'all' || 
                           (filters.status === 'available' && !screen.currentPlaylist) ||
                           screen.status === filters.status;
      
      const matchesGroup = filters.group === 'all' || screen.group === filters.group;
      const matchesOrientation = filters.orientation === 'all' || screen.orientation === filters.orientation;
      
      return matchesSearch && matchesStatus && matchesGroup && matchesOrientation;
    });
  }, [filters]);

  // Get unique groups for filter dropdown
  const availableGroups = useMemo(() => {
    const groups = Array.from(new Set(mockScreens.map(screen => screen.group).filter(Boolean)));
    return groups.sort();
  }, []);

  // Get screen status info
  const getStatusInfo = (status: Screen['status']) => {
    switch (status) {
      case 'online':
        return { icon: Wifi, color: 'text-green-600', bg: 'bg-green-100', label: 'Online' };
      case 'offline':
        return { icon: WifiOff, color: 'text-red-600', bg: 'bg-red-100', label: 'Offline' };
      case 'connecting':
        return { icon: RotateCw, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Connecting' };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Error' };
      case 'maintenance':
        return { icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Maintenance' };
      default:
        return { icon: Monitor, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Unknown' };
    }
  };

  // Format last seen time
  const formatLastSeen = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Handle screen selection
  const handleScreenSelect = useCallback((screenId: string, checked: boolean) => {
    setSelectedScreens(prev => 
      checked 
        ? [...prev, screenId]
        : prev.filter(id => id !== screenId)
    );
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const availableScreenIds = filteredScreens
      .filter(screen => screen.status === 'online')
      .map(screen => screen.id);
    setSelectedScreens(availableScreenIds);
  }, [filteredScreens]);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedScreens([]);
  }, []);

  // Check for assignment conflicts
  const checkConflicts = useCallback(() => {
    const conflicts: AssignmentConflict[] = [];
    
    selectedScreens.forEach(screenId => {
      const screen = mockScreens.find(s => s.id === screenId);
      if (screen?.currentPlaylist && screen.currentPlaylistName) {
        conflicts.push({
          screenId: screen.id,
          screenName: screen.name,
          currentPlaylist: screen.currentPlaylist,
          currentPlaylistName: screen.currentPlaylistName
        });
      }
    });
    
    setAssignmentConflicts(conflicts);
    return conflicts;
  }, [selectedScreens]);

  // Handle assignment
  const handleAssign = useCallback(async () => {
    if (!playlist || selectedScreens.length === 0) return;

    const conflicts = checkConflicts();
    
    if (conflicts.length > 0 && !showConflicts) {
      setShowConflicts(true);
      return;
    }

    setIsAssigning(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onAssign?.(selectedScreens);
      toast.success(`Playlist "${playlist.name}" assigned to ${selectedScreens.length} screen${selectedScreens.length > 1 ? 's' : ''}`);
      onClose();
    } catch (error) {
      toast.error('Failed to assign playlist to screens');
    } finally {
      setIsAssigning(false);
    }
  }, [playlist, selectedScreens, showConflicts, checkConflicts, onAssign, onClose]);

  // Handle conflict resolution
  const handleProceedWithConflicts = useCallback(() => {
    setShowConflicts(false);
    handleAssign();
  }, [handleAssign]);

  if (!playlist) return null;

  const onlineScreens = filteredScreens.filter(s => s.status === 'online');
  const currentlyAssigned = mockScreens.filter(s => playlist.assignedScreens.includes(s.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assign Playlist: {playlist.name}</DialogTitle>
          <DialogDescription>
            Select screens to assign this playlist to for display
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Current Assignments */}
          {currentlyAssigned.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Currently Assigned Screens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentlyAssigned.map(screen => {
                    const statusInfo = getStatusInfo(screen.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div key={screen.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{screen.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {screen.location}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // TODO: Implement unassign functionality
                      console.log('Unassign from all screens');
                    }}
                  >
                    Unassign from All Screens
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Playlist Content Preview */}
          {playlist && playlist.items && playlist.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Playlist Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {playlist.items.map((item, index) => {
                    // Use the robust helper function to extract media
                    const media = extractMediaFromItem(item);
                    
                    // Enhanced debugging - log all possible media access patterns
                    console.log(`🎵 PlaylistAssignment - Item ${index} - Full Analysis:`, {
                      rawItem: item,
                      mediaIdType: typeof item.mediaId,
                      mediaIdValue: item.mediaId,
                      mediaProperty: item.media,
                      extractedMedia: media,
                      hasMedia: !!media,
                      mediaType: media?.type,
                      mediaName: media?.originalName,
                      mediaUrl: media?.secureUrl || media?.url,
                      // Additional debug info
                      mediaKeys: media ? Object.keys(media) : [],
                      itemKeys: Object.keys(item),
                      // Test different extraction methods
                      directMediaId: item.mediaId,
                      directMedia: item.media,
                      typeofMediaId: typeof item.mediaId,
                      isMediaIdObject: typeof item.mediaId === 'object',
                      mediaIdConstructor: item.mediaId?.constructor?.name
                    });
                    
                    return (
                      <div key={item.id || index} className="flex items-center gap-3 p-2 border rounded-lg">
                        <div className="w-8 h-8 rounded border overflow-hidden bg-muted flex items-center justify-center">
                          {media?.secureUrl || media?.url ? (
                            <img
                              src={media.secureUrl || media.url}
                              alt={media.originalName || 'Media item'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Im0xNSAxMi0zLTMtNiA2VjdoMTJ2OGgtM1oiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+';
                              }}
                            />
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {media?.type === 'video' ? '🎬' : media?.type === 'image' ? '🖼️' : '📁'}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {media?.originalName || `Item ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.duration || media?.duration || media?.videoDuration || 0}s • {media?.type || 'unknown'}
                          </p>
                        </div>
                        
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    {playlist.items.length} item{playlist.items.length !== 1 ? 's' : ''} • 
                    {playlist.totalDuration || 0}s total duration
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {playlist && (!playlist.items || playlist.items.length === 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Playlist Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 text-muted-foreground">
                  <p>This playlist is empty</p>
                  <p className="text-sm mt-1">Add media items to the playlist first</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Screen Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign to Screens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search screens..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedScreens.length === onlineScreens.length && onlineScreens.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select all online screens ({onlineScreens.length})
                  </label>
                </div>
                {selectedScreens.length > 0 && (
                  <Badge variant="secondary">
                    {selectedScreens.length} selected
                  </Badge>
                )}
              </div>

              {/* Screen List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredScreens.map(screen => (
                  <div
                    key={screen.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg ${
                      screen.status !== 'online' ? 'opacity-50' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selectedScreens.includes(screen.id)}
                      onCheckedChange={(checked) => handleScreenSelect(screen.id, checked as boolean)}
                      disabled={screen.status !== 'online'}
                    />
                    
                    {(() => {
                      const statusInfo = getStatusInfo(screen.status);
                      const StatusIcon = statusInfo.icon;
                      return (
                        <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                        </div>
                      );
                    })()}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{screen.name}</p>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{screen.id}</code>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {screen.location}
                      </p>
                      {screen.currentPlaylist && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Current: {screen.currentPlaylistName || screen.currentPlaylist}
                        </p>
                      )}
                    </div>
                    
                    <Badge variant="secondary">
                      {getStatusInfo(screen.status).label}
                    </Badge>
                  </div>
                ))}
              </div>

              {filteredScreens.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-8 w-8 mx-auto mb-2" />
                  <p>No screens found matching your search</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Assignment Notes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Only online screens can be assigned new playlists</li>
                <li>• Assigning a playlist will replace the current content on selected screens</li>
                <li>• Changes take effect immediately on connected displays</li>
                <li>• Offline screens will receive the assignment when they come online</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={selectedScreens.length === 0}
          >
            Assign to {selectedScreens.length} Screen{selectedScreens.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}