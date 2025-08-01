"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Card, CardContent } from "./ui/card";
import { Play, Pause, SkipForward, SkipBack, Square } from "lucide-react";

interface PlaylistItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'other';
  duration?: number;
  thumbnailUrl: string;
  fileUrl: string;
}

interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  totalDuration: number;
}

interface PlaylistPreviewProps {
  playlist: Playlist | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistPreview({ playlist, isOpen, onClose }: PlaylistPreviewProps) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const currentItem = playlist?.items[currentItemIndex];

  useEffect(() => {
    if (!isPlaying || !currentItem) return;

    const itemDuration = currentItem.duration || 0;
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / itemDuration);
        
        if (newProgress >= 100) {
          // Move to next item
          if (currentItemIndex < (playlist?.items.length || 0) - 1) {
            setCurrentItemIndex(prev => prev + 1);
            return 0;
          } else {
            // End of playlist
            setIsPlaying(false);
            setCurrentItemIndex(0);
            return 0;
          }
        }
        
        return newProgress;
      });
      
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentItem, currentItemIndex, playlist]);

  useEffect(() => {
    if (currentItem) {
      setTimeRemaining(currentItem.duration || 0);
      setProgress(0);
    }
  }, [currentItemIndex, currentItem]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentItemIndex(0);
    setTimeRemaining(currentItem?.duration || 0);
  };

  const handleNext = () => {
    if (playlist && currentItemIndex < playlist.items.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
      setProgress(0);
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
      setProgress(0);
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
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Preview: {playlist.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Display */}
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
                {currentItem ? (
                  <>
                    {currentItem.type === 'image' ? (
                      <img
                        src={currentItem.fileUrl}
                        alt={currentItem.name}
                        className="w-full h-full object-contain"
                      />
                    ) : currentItem.type === 'video' ? (
                      <video
                        src={currentItem.fileUrl}
                        className="w-full h-full object-contain"
                        muted
                        loop={false}
                      />
                    ) : (
                      <div className="text-white text-center">
                        <p className="text-lg font-medium">{currentItem.name}</p>
                        <p className="text-sm opacity-75">Preview not available</p>
                      </div>
                    )}
                    
                    {/* Overlay Info */}
                    <div className="absolute top-4 left-4 bg-black/75 text-white px-3 py-1 rounded">
                      <p className="text-sm font-medium">{currentItem.name}</p>
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
                    <div className="w-8 h-8 rounded border overflow-hidden bg-muted">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(item.duration || 0)}
                      </p>
                    </div>
                    
                    {index === currentItemIndex && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}