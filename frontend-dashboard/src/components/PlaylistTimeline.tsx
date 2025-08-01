"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Clock } from "lucide-react";

interface PlaylistItem {
  id: string;
  name: string;
  duration?: number;
  type: 'image' | 'video' | 'other';
}

interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  totalDuration: number;
}

interface PlaylistTimelineProps {
  playlist: Playlist;
}

export function PlaylistTimeline({ playlist }: PlaylistTimelineProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'bg-blue-500';
      case 'video':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Duration:</span>
          <span className="font-medium">{formatDuration(playlist.totalDuration)}</span>
        </div>
        
        <div className="relative">
          <div className="flex h-8 bg-muted rounded overflow-hidden">
            {playlist.items.map((item, index) => {
              const widthPercentage = playlist.totalDuration > 0 
                ? ((item.duration || 0) / playlist.totalDuration) * 100 
                : 0;
              
              return (
                <div
                  key={item.id}
                  className={`${getItemColor(item.type)} flex items-center justify-center text-white text-xs font-medium relative group`}
                  style={{ width: `${widthPercentage}%` }}
                >
                  {widthPercentage > 15 && (
                    <span className="truncate px-1">
                      {formatDuration(item.duration || 0)}
                    </span>
                  )}
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {item.name} - {formatDuration(item.duration || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Time markers */}
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0:00</span>
            <span>{formatDuration(playlist.totalDuration)}</span>
          </div>
        </div>
        
        {/* Legend */}
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
      </CardContent>
    </Card>
  );
}