"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Clock, Play, Pause, SkipForward, SkipBack, Image, Video, FileText } from "lucide-react";
import { cn } from "../lib/utils";
import type { Playlist, PlaylistItem, MediaItem } from "../types";

interface PlaylistTimelineProps {
  playlist: Playlist;
  currentPosition?: number;
  onSeek?: (position: number) => void;
  showControls?: boolean;
  className?: string;
}

export function PlaylistTimeline({ 
  playlist, 
  currentPosition = 0, 
  onSeek, 
  showControls = true,
  className 
}: PlaylistTimelineProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'video':
        return 'bg-purple-500 hover:bg-purple-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-3 w-3" />;
      case 'video':
        return <Video className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getItemDisplayData = (item: PlaylistItem) => {
    // If the item has media data, use it; otherwise create a basic representation
    if (item.media) {
      return {
        id: item.id,
        name: item.media.originalName,
        duration: item.duration || item.media.duration || 10,
        type: item.media.type,
        thumbnailUrl: item.media.url
      };
    }
    
    // Fallback for items without media data
    return {
      id: item.id,
      name: `Item ${item.order + 1}`,
      duration: item.duration || 10,
      type: 'other' as const,
      thumbnailUrl: ''
    };
  };

  // Calculate current item based on position
  useEffect(() => {
    let accumulatedTime = 0;
    for (let i = 0; i < playlist.items.length; i++) {
      const itemData = getItemDisplayData(playlist.items[i]);
      if (currentPosition >= accumulatedTime && currentPosition < accumulatedTime + itemData.duration) {
        setCurrentItemIndex(i);
        break;
      }
      accumulatedTime += itemData.duration;
    }
  }, [currentPosition, playlist.items]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || !onSeek) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newPosition = percentage * playlist.totalDuration;
    
    onSeek(Math.max(0, Math.min(playlist.totalDuration, newPosition)));
  }, [onSeek, playlist.totalDuration]);

  const handleTimelineHover = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percentage = hoverX / rect.width;
    const position = percentage * playlist.totalDuration;
    
    setHoverPosition(Math.max(0, Math.min(playlist.totalDuration, position)));
  }, [playlist.totalDuration]);

  const getItemAtPosition = (position: number) => {
    let accumulatedTime = 0;
    for (const item of playlist.items) {
      const itemData = getItemDisplayData(item);
      if (position >= accumulatedTime && position < accumulatedTime + itemData.duration) {
        return { item: itemData, startTime: accumulatedTime };
      }
      accumulatedTime += itemData.duration;
    }
    return null;
  };

  const currentItem = playlist.items[currentItemIndex] ? getItemDisplayData(playlist.items[currentItemIndex]) : null;
  const hoverItem = getItemAtPosition(hoverPosition);
  const progressPercentage = playlist.totalDuration > 0 ? (currentPosition / playlist.totalDuration) * 100 : 0;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (currentItemIndex < playlist.items.length - 1) {
      let accumulatedTime = 0;
      for (let i = 0; i <= currentItemIndex; i++) {
        const itemData = getItemDisplayData(playlist.items[i]);
        accumulatedTime += itemData.duration;
      }
      onSeek?.(accumulatedTime);
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      let accumulatedTime = 0;
      for (let i = 0; i < currentItemIndex - 1; i++) {
        const itemData = getItemDisplayData(playlist.items[i]);
        accumulatedTime += itemData.duration;
      }
      onSeek?.(accumulatedTime);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline Preview
          </CardTitle>
          {currentItem && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {getItemIcon(currentItem.type)}
              <span className="font-medium">{currentItem.name}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Position and Duration */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Position:</span>
            <span className="font-mono font-medium">{formatDuration(currentPosition)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-mono font-medium">{formatDuration(playlist.totalDuration)}</span>
          </div>
        </div>
        
        {/* Interactive Timeline */}
        <div className="space-y-2">
          <div 
            ref={timelineRef}
            className="relative cursor-pointer group"
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineHover}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {/* Timeline Background */}
            <div className="flex h-12 bg-muted rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary/20 transition-all">
              {playlist.items.map((item, index) => {
                const widthPercentage = playlist.totalDuration > 0 
                  ? ((item.duration || 0) / playlist.totalDuration) * 100 
                  : 0;
                
                return (
                  <div
                    key={item.playlistItemId || item.id}
                    className={cn(
                      getItemColor(item.type),
                      "flex items-center justify-center text-white text-xs font-medium relative group/item transition-all duration-200",
                      index === currentItemIndex && "ring-2 ring-white ring-inset"
                    )}
                    style={{ width: `${widthPercentage}%` }}
                  >
                    {/* Item Content */}
                    <div className="flex items-center gap-1 px-2">
                      {getItemIcon(item.type)}
                      {widthPercentage > 20 && (
                        <span className="truncate">
                          {formatDuration(item.duration || 0)}
                        </span>
                      )}
                    </div>
                    
                    {/* Item Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 pointer-events-none">
                      <div className="bg-black text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-gray-300">
                          Duration: {formatDuration(item.duration || 0)}
                        </div>
                        <div className="text-gray-300">
                          Type: {item.type}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Progress Indicator */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg rounded-full transition-all duration-100 pointer-events-none"
              style={{ left: `${progressPercentage}%`, transform: 'translateX(-50%)' }}
            />
            
            {/* Hover Indicator */}
            {isHovering && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-primary/60 rounded-full pointer-events-none"
                style={{ 
                  left: `${playlist.totalDuration > 0 ? (hoverPosition / playlist.totalDuration) * 100 : 0}%`,
                  transform: 'translateX(-50%)' 
                }}
              />
            )}
            
            {/* Hover Tooltip */}
            {isHovering && hoverItem && (
              <div 
                className="absolute bottom-full mb-2 z-30 pointer-events-none"
                style={{ 
                  left: `${playlist.totalDuration > 0 ? (hoverPosition / playlist.totalDuration) * 100 : 0}%`,
                  transform: 'translateX(-50%)' 
                }}
              >
                <div className="bg-primary text-primary-foreground text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                  <div className="font-semibold">{hoverItem.item.name}</div>
                  <div className="opacity-90">
                    {formatDuration(hoverPosition)} / {formatDuration(playlist.totalDuration)}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Time markers */}
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>0:00</span>
            {playlist.totalDuration > 60 && (
              <span>{formatDuration(playlist.totalDuration / 2)}</span>
            )}
            <span>{formatDuration(playlist.totalDuration)}</span>
          </div>
        </div>
        
        {/* Controls */}
        {showControls && onSeek && (
          <div className="flex items-center justify-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentItemIndex === 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentItemIndex >= playlist.items.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Legend */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Images</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Videos</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {playlist.items.length} items • {formatDuration(playlist.totalDuration)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}