"use client";

import { useState, useRef } from "react";
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
import { type MediaFile } from "./MediaLibrary";
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
  GripVertical,
  X,
  Settings
} from "lucide-react";
import { toast } from "sonner";

interface PlaylistItem extends MediaFile {
  playlistItemId: string;
  order: number;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  items: PlaylistItem[];
  totalDuration: number;
  assignedScreens: string[];
  createdAt: string;
  updatedAt: string;
}

export function PlaylistEditor() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [draggedItem, setDraggedItem] = useState<MediaFile | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const dragCounter = useRef(0);

  // Sample playlists data
  const playlists: Playlist[] = [
    {
      id: "1",
      name: "Main Lobby Welcome",
      description: "Welcome content for main lobby display",
      items: [
        {
          id: "1",
          playlistItemId: "p1-1",
          name: "company-logo.png",
          type: "image",
          format: "PNG",
          size: 2.5 * 1024 * 1024,
          dimensions: { width: 1920, height: 1080 },
          duration: 10,
          uploadDate: "2024-08-01T10:30:00Z",
          thumbnailUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
          fileUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1920&h=1080&fit=crop",
          tags: ["logo", "branding"],
          order: 0
        },
        {
          id: "2",
          playlistItemId: "p1-2",
          name: "holiday-promotion.mp4",
          type: "video",
          format: "MP4",
          size: 45.2 * 1024 * 1024,
          dimensions: { width: 1920, height: 1080 },
          duration: 30,
          uploadDate: "2024-07-28T14:15:00Z",
          thumbnailUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop",
          fileUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&h=1080&fit=crop",
          tags: ["promotion", "holiday", "sale"],
          order: 1
        },
        {
          id: "3",
          playlistItemId: "p1-3",
          name: "office-background.jpg",
          type: "image",
          format: "JPEG",
          size: 8.1 * 1024 * 1024,
          dimensions: { width: 3840, height: 2160 },
          duration: 15,
          uploadDate: "2024-07-25T09:20:00Z",
          thumbnailUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
          fileUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=3840&h=2160&fit=crop",
          tags: ["background", "office"],
          order: 2
        }
      ],
      totalDuration: 55,
      assignedScreens: ["SCR-001", "SCR-002"],
      createdAt: "2024-07-20T10:00:00Z",
      updatedAt: "2024-08-01T14:30:00Z"
    },
    {
      id: "2",
      name: "Cafeteria Menu",
      description: "Daily menu and specials for cafeteria displays",
      items: [],
      totalDuration: 0,
      assignedScreens: ["SCR-002"],
      createdAt: "2024-07-22T09:00:00Z",
      updatedAt: "2024-07-22T09:00:00Z"
    }
  ];

  // Sample media library
  const mediaLibrary: MediaFile[] = [
    {
      id: "4",
      name: "product-showcase.mp4",
      type: "video",
      format: "MP4",
      size: 67.8 * 1024 * 1024,
      dimensions: { width: 1920, height: 1080 },
      duration: 45,
      uploadDate: "2024-07-20T16:45:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&h=1080&fit=crop",
      tags: ["product", "showcase", "demo"]
    },
    {
      id: "5",
      name: "team-photo.png",
      type: "image",
      format: "PNG",
      size: 12.3 * 1024 * 1024,
      dimensions: { width: 2560, height: 1440 },
      duration: 8,
      uploadDate: "2024-07-15T11:30:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=2560&h=1440&fit=crop",
      tags: ["team", "people", "company"]
    },
    {
      id: "6",
      name: "weather-widget.mp4",
      type: "video",
      format: "MP4",
      size: 23.7 * 1024 * 1024,
      dimensions: { width: 1280, height: 720 },
      duration: 60,
      uploadDate: "2024-07-10T13:20:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1280&h=720&fit=crop",
      tags: ["weather", "widget", "information"]
    }
  ];

  const currentPlaylist = playlists.find(p => p.id === selectedPlaylist);
  
  const filteredMedia = mediaLibrary.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

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

  const handleDragStart = (e: React.DragEvent, item: MediaFile) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (index !== undefined) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverIndex(null);
    
    if (draggedItem) {
      const newItem: PlaylistItem = {
        ...draggedItem,
        playlistItemId: `${selectedPlaylist}-${Date.now()}`,
        order: index !== undefined ? index : (currentPlaylist?.items.length || 0)
      };
      
      toast.success(`Added "${draggedItem.name}" to playlist`);
      setDraggedItem(null);
    }
  };

  const removePlaylistItem = (playlistItemId: string) => {
    toast.success("Item removed from playlist");
  };

  const duplicatePlaylist = () => {
    toast.success("Playlist duplicated");
  };

  const savePlaylist = () => {
    toast.success("Playlist saved");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Playlist Editor</h1>
          <p className="text-muted-foreground">Create and manage content playlists for your displays</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Play className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={() => setShowAssignment(true)}>
            <Monitor className="h-4 w-4 mr-2" />
            Assign to Screens
          </Button>
          <Button onClick={savePlaylist}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Playlist Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                <SelectTrigger className="w-64">
                  <SelectValue />
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
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={duplicatePlaylist}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm">
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
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-grab hover:bg-muted/50 active:cursor-grabbing"
                >
                  <div className="w-12 h-12 rounded border overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getFileIcon(item.type)}
                      <p className="font-medium text-sm truncate">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.duration && (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(item.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              )}
            </div>

            {currentPlaylist ? (
              <div className="flex-1 flex flex-col">
                {/* Drop Zone */}
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={(e) => handleDragOver(e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e)}
                  className={`flex-1 border-2 border-dashed rounded-lg p-4 ${
                    draggedItem ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
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
                    <div className="space-y-2">
                      {currentPlaylist.items.map((item, index) => (
                        <div key={item.playlistItemId}>
                          {dragOverIndex === index && (
                            <div className="h-2 bg-primary/20 rounded-full mb-2" />
                          )}
                          
                          <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            
                            <div className="w-12 h-12 rounded border overflow-hidden bg-muted">
                              <img
                                src={item.thumbnailUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getFileIcon(item.type)}
                                <p className="font-medium truncate">{item.name}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(item.duration || 0)}</span>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePlaylistItem(item.playlistItemId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {dragOverIndex === currentPlaylist.items.length && (
                        <div className="h-2 bg-primary/20 rounded-full mt-2" />
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                {currentPlaylist.items.length > 0 && (
                  <div className="mt-4">
                    <PlaylistTimeline playlist={currentPlaylist} />
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
      />
    </div>
  );
}