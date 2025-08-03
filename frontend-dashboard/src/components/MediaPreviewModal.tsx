"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Edit3, 
  Download, 
  Trash2, 
  X, 
  Eye, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  RotateCw,
  Calendar,
  FileText,
  Tag,
  Monitor,
  Loader2,
  AlertTriangle
} from "lucide-react";
import type { MediaItem } from "../types";
import { useMediaActions } from "../stores/useMediaStore";
import { MediaEditModal } from "./MediaEditModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface MediaPreviewModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaPreviewModal({ media, isOpen, onClose }: MediaPreviewModalProps) {
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const { downloadMedia, deleteMedia } = useMediaActions();

  // Reset state when modal opens/closes or media changes
  useEffect(() => {
    if (!isOpen || !media) {
      setViewMode('view');
      setIsEditModalOpen(false);
      setIsDeleteModalOpen(false);
      setDownloadError(null);
      setIsPlaying(false);
    }
  }, [isOpen, media]);

  // Handle video element reference
  useEffect(() => {
    if (videoElement && media?.type === 'video') {
      const handleLoadedMetadata = () => {
        // Set default volume
        videoElement.volume = 0.7;
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);

      return () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
      };
    }
  }, [videoElement, media]);

  if (!media) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      const downloadUrl = await downloadMedia(media._id);
      if (downloadUrl) {
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = media.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setDownloadError('Failed to generate download URL');
      }
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleVideoToggle = () => {
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause();
      } else {
        videoElement.play();
      }
    }
  };

  const handleMuteToggle = () => {
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
      setIsMuted(videoElement.muted);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAspectRatioDisplay = () => {
    if (media.width && media.height) {
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(media.width, media.height);
      return `${media.width / divisor}:${media.height / divisor}`;
    }
    return media.aspectRatio || 'Unknown';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden">
          <div className="flex h-full">
            {/* Media Preview Section */}
            <div className="flex-1 bg-black relative flex items-center justify-center">
              {media.type === 'image' ? (
                <img
                  src={media.secureUrl}
                  alt={media.originalName}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={setVideoElement}
                    src={media.secureUrl}
                    className="max-w-full max-h-full object-contain"
                    controls={false}
                    muted={isMuted}
                    playsInline
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/70 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleVideoToggle}
                        className="text-white hover:bg-white/20"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMuteToggle}
                        className="text-white hover:bg-white/20"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <div className="text-white text-sm">
                      {media.formattedDuration || 'Unknown duration'}
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:bg-white/20 bg-black/50"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* View Mode Toggle */}
              <div className="absolute top-4 left-4 flex gap-2">
                <Button
                  variant={viewMode === 'view' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('view')}
                  className="bg-black/70 text-white border-white/20 hover:bg-white/20"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant={viewMode === 'edit' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('edit')}
                  className="bg-black/70 text-white border-white/20 hover:bg-white/20"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Details
                </Button>
              </div>
            </div>

            {/* Information Panel */}
            <div className={`w-96 bg-background border-l transition-all duration-300 ${
              viewMode === 'edit' ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 h-full'
            }`}>
              <div className="p-6 h-full overflow-y-auto">
                {/* Header */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold truncate">{media.originalName}</h2>
                    {viewMode === 'edit' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode('view')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={media.type === 'image' ? 'default' : 'secondary'}>
                      {media.type.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {media.format.toUpperCase()}
                    </Badge>
                    {media.isActive && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator className="mb-6" />

                {/* Download Error Alert */}
                {downloadError && (
                  <Alert className="mb-4" variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{downloadError}</AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-medium">Actions</h3>
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={handleEdit} 
                      variant="outline" 
                      className="justify-start"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Metadata
                    </Button>
                    
                    <Button 
                      onClick={handleDownload} 
                      variant="outline" 
                      className="justify-start"
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download
                    </Button>
                    
                    <Button 
                      onClick={handleDelete} 
                      variant="outline" 
                      className="justify-start text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                <Separator className="mb-6" />

                {/* Media Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">File Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">File Size:</span>
                        <span className="text-sm font-mono">{media.formattedFileSize}</span>
                      </div>
                      
                      {media.width && media.height && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Dimensions:</span>
                          <span className="text-sm font-mono">{media.width} × {media.height}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Aspect Ratio:</span>
                        <span className="text-sm font-mono">{getAspectRatioDisplay()}</span>
                      </div>
                      
                      {media.type === 'video' && media.formattedDuration && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Duration:</span>
                          <span className="text-sm font-mono">{media.formattedDuration}</span>
                        </div>
                      )}
                      
                      {media.type === 'image' && media.duration && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Display Duration:</span>
                          <span className="text-sm font-mono">{media.duration}s</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Usage Information */}
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Usage
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Used in playlists:</span>
                        <span className="text-sm font-mono">{media.usageCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {media.tags && media.tags.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {media.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {media.description && (
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Description
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {media.description}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Dates
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Created:</span>
                        <span className="text-sm">{formatDate(media.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Modified:</span>
                        <span className="text-sm">{formatDate(media.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div>
                    <h3 className="font-medium mb-3">Technical Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">File ID:</span>
                        <span className="text-xs font-mono truncate max-w-[120px]" title={media._id}>
                          {media._id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Cloudinary ID:</span>
                        <span className="text-xs font-mono truncate max-w-[120px]" title={media.cloudinaryId}>
                          {media.cloudinaryId}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <MediaEditModal
        media={media}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        media={media}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}