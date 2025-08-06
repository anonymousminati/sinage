"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Card, CardContent } from "./ui/card";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Square, 
  Maximize2, 
  Settings, 
  Volume2, 
  VolumeX,
  RotateCcw,
  FastForward,
  Image,
  Video,
  Clock,
  Monitor
} from "lucide-react";
import { cn } from "../lib/utils";

// Import types from the main types file
import type { Playlist as PlaylistType, PlaylistItem as PlaylistItemType, MediaItem } from '../types';

// Helper function to safely extract media data from playlist item
function extractMediaFromItem(item: PlaylistItemType): MediaItem | null {
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

interface PlaylistPreviewProps {
  playlist: PlaylistType | null;
  isOpen: boolean;
  onClose: () => void;
  autoPlay?: boolean;
  className?: string;
}

interface PreviewSettings {
  speed: number;
  loop: boolean;
  autoAdvance: boolean;
  volume: number;
  muted: boolean;
  showInfo: boolean;
}

export function PlaylistPreview({ 
  playlist, 
  isOpen, 
  onClose, 
  autoPlay = false,
  className 
}: PlaylistPreviewProps) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<PreviewSettings>({
    speed: 1,
    loop: false,
    autoAdvance: true,
    volume: 0.7,
    muted: false,
    showInfo: true
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(currentItemIndex);

  const currentItem = playlist?.items[currentItemIndex];
  const currentMedia = extractMediaFromItem(currentItem);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentIndexRef.current = currentItemIndex;
  }, [currentItemIndex]);
  
  // Enhanced debugging for current media access
  useEffect(() => {
    if (currentItem) {
      console.log(`🎵 PlaylistPreview - Current Item Analysis:`, {
        itemIndex: currentItemIndex,
        rawItem: currentItem,
        mediaIdType: typeof currentItem.mediaId,
        mediaIdValue: currentItem.mediaId,
        mediaProperty: currentItem.media,
        extractedMedia: currentMedia,
        hasMedia: !!currentMedia,
        mediaType: currentMedia?.type,
        mediaName: currentMedia?.originalName,
        mediaUrl: currentMedia?.secureUrl || currentMedia?.url,
        // Additional debug info
        mediaKeys: currentMedia ? Object.keys(currentMedia) : [],
        itemKeys: Object.keys(currentItem),
        // Test different extraction methods
        directMediaId: currentItem.mediaId,
        directMedia: currentItem.media,
        typeofMediaId: typeof currentItem.mediaId,
        isMediaIdObject: typeof currentItem.mediaId === 'object',
        mediaIdConstructor: currentItem.mediaId?.constructor?.name
      });
    }
  }, [currentItem, currentItemIndex, currentMedia]);

  // Enhanced playback logic with speed control
  useEffect(() => {
    if (!isPlaying || !playlist?.items?.length) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const intervalDuration = 100; // Update every 100ms for smoother progress
    
    intervalRef.current = setInterval(() => {
      // Use ref to get current index to avoid stale closures
      const currentIndex = currentIndexRef.current;
      const currentItem = playlist?.items[currentIndex];
      if (!currentItem) return;
      
      const currentMedia = extractMediaFromItem(currentItem);
      const itemDuration = currentItem.duration || currentMedia?.duration || currentMedia?.videoDuration || 0;
      
      if (itemDuration <= 0) return;
      
      const progressIncrement = (intervalDuration / 1000) * settings.speed * (100 / itemDuration);
      
      setProgress(prev => {
        const newProgress = prev + progressIncrement;
        
        if (newProgress >= 100) {
          // Move to next item or loop
          const currentIndex = currentIndexRef.current;
          console.log('🎵 Progress completed, advancing...', {
            currentIndex,
            totalItems: playlist?.items.length,
            autoAdvance: settings.autoAdvance,
            hasNext: currentIndex < (playlist?.items.length || 0) - 1
          });
          
          if (settings.autoAdvance) {
            if (currentIndex < (playlist?.items.length || 0) - 1) {
              console.log('🎵 Moving to next item:', currentIndex + 1);
              setCurrentItemIndex(currentIndex + 1);
              return 0; // Reset progress
            } else if (settings.loop) {
              console.log('🎵 Looping back to start');
              setCurrentItemIndex(0);
              return 0;
            } else {
              // End of playlist
              console.log('🎵 End of playlist reached');
              setIsPlaying(false);
              return 100;
            }
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
        
        return newProgress;
      });
      
      // Update time tracking
      setCurrentTime(prev => {
        const newTime = prev + (intervalDuration / 1000) * settings.speed;
        return Math.min(newTime, itemDuration);
      });
      
      setTimeRemaining(prev => {
        const newRemaining = prev - (intervalDuration / 1000) * settings.speed;
        return Math.max(0, newRemaining);
      });
    }, intervalDuration);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playlist, settings.speed, settings.autoAdvance, settings.loop]);

  // Reset progress when item changes
  useEffect(() => {
    console.log('🎵 Current item changed:', {
      index: currentItemIndex,
      itemId: currentItem?.id,
      mediaName: currentMedia?.originalName,
      itemDuration: currentItem?.duration,
      mediaDuration: currentMedia?.duration,
      videoDuration: currentMedia?.videoDuration
    });
    
    if (currentItem) {
      setTimeRemaining(currentItem.duration || currentMedia?.duration || currentMedia?.videoDuration || 0);
      setCurrentTime(0);
      setProgress(0);
    }
  }, [currentItemIndex, currentItem, currentMedia]);

  // Video playback control - sync video element with playback state
  useEffect(() => {
    if (videoRef.current && currentMedia?.type === 'video') {
      const video = videoRef.current;
      
      // Set volume and muted state
      video.volume = settings.volume;
      video.muted = settings.muted;
      
      if (isPlaying) {
        video.play().catch(err => {
          console.error('Failed to play video:', err);
        });
      } else {
        video.pause();
      }
    }
  }, [isPlaying, currentMedia, settings.volume, settings.muted]);

  // Video seeking - sync video time with progress
  useEffect(() => {
    if (videoRef.current && currentMedia?.type === 'video') {
      const video = videoRef.current;
      const itemDuration = currentItem?.duration || currentMedia?.duration || currentMedia?.videoDuration || 0;
      
      if (itemDuration > 0) {
        const newTime = (progress / 100) * itemDuration;
        
        // Only update video time if there's a significant difference to avoid constant updates
        if (Math.abs(video.currentTime - newTime) > 0.5) {
          video.currentTime = newTime;
        }
      }
    }
  }, [progress, currentMedia, currentItem]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('🎵 Dialog opened, playlist items:', playlist?.items?.map((item, index) => ({
        index,
        id: item.id,
        mediaName: extractMediaFromItem(item)?.originalName,
        duration: item.duration,
        order: item.order
      })));
      
      setCurrentItemIndex(0);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(autoPlay);
      if (playlist?.items[0]) {
        const firstItem = playlist.items[0];
        const firstMedia = extractMediaFromItem(firstItem);
        setTimeRemaining(firstItem.duration || firstMedia?.duration || firstMedia?.videoDuration || 0);
      }
    } else {
      setIsPlaying(false);
      setShowSettings(false);
      setIsFullscreen(false);
    }
  }, [isOpen, autoPlay, playlist]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          isPlaying ? handlePause() : handlePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'KeyF':
          e.preventDefault();
          setIsFullscreen(!isFullscreen);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, isFullscreen, onClose]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setCurrentItemIndex(0);
    if (playlist?.items[0]) {
      const firstItem = playlist.items[0];
      const firstMedia = extractMediaFromItem(firstItem);
      setTimeRemaining(firstItem.duration || firstMedia?.duration || firstMedia?.videoDuration || 0);
    }
  }, [playlist]);

  const handleNext = useCallback(() => {
    if (playlist && currentItemIndex < playlist.items.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
      setProgress(0);
      setCurrentTime(0);
    }
  }, [playlist, currentItemIndex]);

  const handlePrevious = useCallback(() => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
      setProgress(0);
      setCurrentTime(0);
    }
  }, [currentItemIndex]);

  const handleSeek = useCallback((newProgress: number[]) => {
    if (!currentItem) return;
    
    const seekProgress = newProgress[0];
    const itemDuration = currentItem.duration || currentMedia?.duration || currentMedia?.videoDuration || 0;
    const newTime = (seekProgress / 100) * itemDuration;
    
    setProgress(seekProgress);
    setCurrentTime(newTime);
    setTimeRemaining(itemDuration - newTime);
  }, [currentItem]);

  const handleItemSelect = useCallback((index: number) => {
    setCurrentItemIndex(index);
    setProgress(0);
    setCurrentTime(0);
    if (playlist?.items[index]) {
      const selectedItem = playlist.items[index];
      const selectedMedia = extractMediaFromItem(selectedItem);
      setTimeRemaining(selectedItem.duration || selectedMedia?.duration || selectedMedia?.videoDuration || 0);
    }
  }, [playlist]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const updateSettings = useCallback((newSettings: Partial<PreviewSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!playlist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={dialogRef}
        className={cn(
          "max-w-6xl max-h-[95vh] p-0",
          isFullscreen && "max-w-full max-h-full w-screen h-screen",
          className
        )}
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-3">
                <Monitor className="h-5 w-5" />
                Preview: {playlist.name}
                <Badge variant="outline" className="ml-2">
                  {playlist.items.length} items
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Preview your playlist content and media items
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 pt-0 space-y-4 overflow-y-auto">
          {/* Settings Panel */}
          {showSettings && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Preview Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Playback Speed: {settings.speed}x</Label>
                    <Slider
                      value={[settings.speed]}
                      onValueChange={([speed]) => updateSettings({ speed })}
                      min={0.25}
                      max={3}
                      step={0.25}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Volume: {Math.round(settings.volume * 100)}%</Label>
                    <Slider
                      value={[settings.volume]}
                      onValueChange={([volume]) => updateSettings({ volume })}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.loop}
                        onCheckedChange={(loop) => updateSettings({ loop })}
                      />
                      <Label>Loop Playlist</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.autoAdvance}
                        onCheckedChange={(autoAdvance) => updateSettings({ autoAdvance })}
                      />
                      <Label>Auto Advance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.showInfo}
                        onCheckedChange={(showInfo) => updateSettings({ showInfo })}
                      />
                      <Label>Show Info</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Display */}
          <Card>
            <CardContent className="p-0">
              <div className={cn(
                "bg-black rounded-lg overflow-hidden flex items-center justify-center relative",
                isFullscreen ? "aspect-auto h-[60vh]" : "aspect-video"
              )}>
                {currentItem ? (
                  <>
                    {/* Debug info - remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="absolute top-16 left-4 bg-black/75 text-white px-2 py-1 rounded text-xs">
                        <p>Item: {currentItem?.id}</p>
                        <p>Media: {currentMedia?.originalName}</p>
                        <p>Type: {currentMedia?.type}</p>
                        <p>URL: {currentMedia?.secureUrl ? 'secure' : currentMedia?.url ? 'regular' : 'missing'}</p>
                      </div>
                    )}
                    {currentMedia?.type === 'image' && (currentMedia?.secureUrl || currentMedia?.url) ? (
                      <img
                        src={currentMedia.secureUrl || currentMedia.url}
                        alt={currentMedia?.originalName || 'Media item'}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error('Failed to load image:', currentMedia?.secureUrl || currentMedia?.url);
                        }}
                      />
                    ) : currentMedia?.type === 'video' && (currentMedia?.secureUrl || currentMedia?.url) ? (
                      <video
                        ref={videoRef}
                        src={currentMedia.secureUrl || currentMedia.url}
                        className="w-full h-full object-contain"
                        muted={settings.muted}
                        loop={false}
                        autoPlay={false}
                        controls={false}
                        playsInline
                        onError={(e) => {
                          console.error('Failed to load video:', currentMedia?.secureUrl || currentMedia?.url);
                        }}
                        onLoadedData={() => {
                          console.log('Video loaded:', currentMedia?.originalName);
                        }}
                      />
                    ) : (
                      <div className="text-white text-center">
                        <p className="text-lg font-medium">{currentMedia?.originalName || 'Unknown Media'}</p>
                        <p className="text-sm opacity-75">Preview not available for this media type</p>
                        {currentMedia && (
                          <p className="text-xs opacity-50 mt-2">Type: {currentMedia.type}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Overlay Info */}
                    <div className="absolute top-4 left-4 bg-black/75 text-white px-3 py-1 rounded">
                      <p className="text-sm font-medium">{currentMedia?.originalName || 'Unknown Media'}</p>
                    </div>
                    
                    <div className="absolute top-4 right-4 bg-black/75 text-white px-3 py-1 rounded">
                      <p className="text-sm">{formatTime(timeRemaining)}</p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
                      <Progress value={progress} className="h-2" />
                    </div>
                  </>
                ) : (
                  <div className="text-white text-center">
                    <p className="text-lg">No content in playlist</p>
                    <p className="text-sm opacity-75 mt-2">Add media items to preview playlist content</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentItemIndex === 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            {isPlaying ? (
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handlePlay}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={handleStop}>
              <Square className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!playlist || currentItemIndex >= playlist.items.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Playlist Queue */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Playlist Queue</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {playlist.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded ${
                      index === currentItemIndex ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded border overflow-hidden bg-muted flex items-center justify-center">
                      {(() => {
                        const mediaItem = extractMediaFromItem(item);
                        const mediaUrl = mediaItem?.secureUrl || mediaItem?.url;
                        if (mediaUrl) {
                          return (
                            <img
                              src={mediaUrl}
                              alt={mediaItem?.originalName || 'Media item'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Im0xNSAxMi0zLTMtNiA2VjdoMTJ2OGgtM1oiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+';
                              }}
                            />
                          );
                        } else {
                          // Show placeholder icon when no media URL
                          return (
                            <Image className="h-4 w-4 text-muted-foreground" />
                          );
                        }
                      })()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {(() => {
                        const mediaItem = extractMediaFromItem(item);
                        return (
                          <>
                            <p className="text-sm font-medium truncate">{mediaItem?.originalName || 'Unknown Media'}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(item.duration || mediaItem?.duration || mediaItem?.videoDuration || 0)}
                            </p>
                          </>
                        );
                      })()
                    }</div>
                    
                    {index === currentItemIndex && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts Help */}
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Space</kbd> Play/Pause</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">←/→</kbd> Previous/Next</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">F</kbd> Fullscreen</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> Close</span>
                </div>
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}