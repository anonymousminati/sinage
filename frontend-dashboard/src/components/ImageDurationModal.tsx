"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Clock, Image as ImageIcon, Tag, FileText, Loader2, AlertTriangle } from "lucide-react";
import type { MediaItem } from "../types";
import { useMediaActions, useUploading } from "../stores/useMediaStore";

interface ImageDurationModalProps {
  file: File | null;
  media?: MediaItem | null; // For editing existing media
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (duration: number, tags?: string, description?: string) => void; // For new uploads
  mode?: 'upload' | 'edit'; // Default to 'upload' for backward compatibility
}

export function ImageDurationModal({ 
  file, 
  media, 
  isOpen, 
  onClose, 
  onConfirm, 
  mode = 'upload' 
}: ImageDurationModalProps) {
  const [duration, setDuration] = useState([10]); // Default 10 seconds
  const [customDuration, setCustomDuration] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{duration?: string; tags?: string; description?: string}>({});

  const { updateMedia } = useMediaActions();
  const isUploading = useUploading();

  // Initialize form data based on mode
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && media) {
        setDuration([media.duration || 10]);
        setTags(media.tags.join(', '));
        setDescription(media.description || '');
      } else {
        setDuration([10]);
        setTags('');
        setDescription('');
      }
      setCustomDuration('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, mode, media]);

  // Determine what to display
  const displayFile = file;
  const displayMedia = media;
  const showFilePreview = mode === 'upload' && displayFile;
  const showMediaPreview = mode === 'edit' && displayMedia;

  if (!showFilePreview && !showMediaPreview) return null;

  const previewUrl = showFilePreview 
    ? URL.createObjectURL(displayFile!) 
    : displayMedia?.secureUrl;

  const validateForm = (): boolean => {
    const newErrors: {duration?: string; tags?: string; description?: string} = {};

    const finalDuration = customDuration ? parseInt(customDuration) : duration[0];
    if (!finalDuration || finalDuration < 1) {
      newErrors.duration = 'Duration must be at least 1 second';
    } else if (finalDuration > 3600) {
      newErrors.duration = 'Duration cannot exceed 1 hour (3600 seconds)';
    }

    if (tags.trim()) {
      const tagList = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tagList.length > 20) {
        newErrors.tags = 'Maximum 20 tags allowed';
      }
      
      const invalidTags = tagList.filter(tag => tag.length > 50);
      if (invalidTags.length > 0) {
        newErrors.tags = 'Each tag must be 50 characters or less';
      }
    }

    if (description && description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    const finalDuration = customDuration ? parseInt(customDuration) : duration[0];
    const finalTags = tags.trim();
    const finalDescription = description.trim();

    if (mode === 'upload' && onConfirm) {
      // Handle new upload
      onConfirm(finalDuration, finalTags || undefined, finalDescription || undefined);
    } else if (mode === 'edit' && displayMedia) {
      // Handle editing existing media
      setIsSubmitting(true);
      try {
        const updateData: Partial<Pick<MediaItem, 'duration' | 'tags' | 'description'>> = {
          duration: finalDuration,
          tags: finalTags ? finalTags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          description: finalDescription || undefined
        };

        await updateMedia(displayMedia._id, updateData);
        onClose();
      } catch (error) {
        // Error is handled by the store
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const presetDurations = [3, 5, 10, 15, 30, 60];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDisplayName = () => {
    if (showFilePreview) return displayFile!.name;
    if (showMediaPreview) return displayMedia!.originalName;
    return 'Unknown';
  };

  const getFileSize = () => {
    if (showFilePreview) return displayFile!.size;
    if (showMediaPreview) return displayMedia!.fileSize;
    return 0;
  };

  const getFileType = () => {
    if (showFilePreview) return displayFile!.type;
    if (showMediaPreview) return `${displayMedia!.type}/${displayMedia!.format}`;
    return 'Unknown';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {mode === 'upload' ? 'Set Image Display Duration' : 'Edit Image Settings'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'upload' 
              ? 'Configure how long this image should be displayed in playlists and add optional metadata'
              : 'Update display duration, tags, and description for this image'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-32 h-24 rounded border overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt={getDisplayName()}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium">{getDisplayName()}</h4>
                  {showMediaPreview && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default">IMAGE</Badge>
                      <Badge variant="outline">{displayMedia!.format.toUpperCase()}</Badge>
                      {displayMedia!.isActive && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Size: {formatFileSize(getFileSize())}</p>
                    <p>Type: {getFileType()}</p>
                    {showMediaPreview && displayMedia!.width && displayMedia!.height && (
                      <p>Dimensions: {displayMedia!.width} × {displayMedia!.height}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duration Settings */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Display Duration</Label>
              <p className="text-sm text-muted-foreground mt-1">
                How long should this image be shown when played in a playlist?
              </p>
            </div>

            {/* Preset Buttons */}
            <div>
              <Label className="text-sm">Quick Select</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {presetDurations.map((preset) => (
                  <Button
                    key={preset}
                    variant={duration[0] === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDuration([preset]);
                      setCustomDuration("");
                    }}
                  >
                    {preset}s
                  </Button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-3">
              <Label className="text-sm">Adjust Duration</Label>
              <div className="space-y-2">
                <Slider
                  value={duration}
                  onValueChange={(value) => {
                    setDuration(value);
                    setCustomDuration("");
                  }}
                  max={120}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1s</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {duration[0]} second{duration[0] !== 1 ? 's' : ''}
                  </span>
                  <span>120s</span>
                </div>
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
              <Label htmlFor="customDuration" className="text-sm">Or Enter Custom Duration</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="customDuration"
                  type="number"
                  placeholder="Enter seconds"
                  value={customDuration}
                  onChange={(e) => {
                    setCustomDuration(e.target.value);
                    if (e.target.value) {
                      setDuration([parseInt(e.target.value) || 1]);
                    }
                  }}
                  min="1"
                  max="3600"
                  className="max-w-32"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
              {errors.duration && (
                <p className="text-sm text-destructive mt-1">{errors.duration}</p>
              )}
            </div>
          </div>

          {/* Optional Metadata */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Optional Information</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Add tags and description to help organize your media
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="tags" className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </Label>
                <Input
                  id="tags"
                  placeholder="e.g., logo, promotion, background (comma separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="mt-1"
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    Separate multiple tags with commas (max 20 tags)
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {tags.split(',').filter(tag => tag.trim()).length}/20
                  </span>
                </div>
                {errors.tags && (
                  <p className="text-sm text-destructive">{errors.tags}</p>
                )}
                
                {/* Tag Preview */}
                {tags.trim() && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.split(',').map((tag, index) => {
                      const trimmedTag = tag.trim();
                      if (!trimmedTag) return null;
                      return (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {trimmedTag}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this image..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 resize-none"
                  rows={3}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    Optional description to help organize your media
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {description.length}/500
                  </span>
                </div>
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Store Error Alert */}
          {mode === 'edit' && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Changes will be saved immediately and reflected across all playlists using this image.
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {mode === 'upload' ? 'Playlist Preview' : 'Current Settings'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                This image will display for <strong>{customDuration || duration[0]} seconds</strong> when 
                included in a playlist. 
                {mode === 'upload' && 'You can always change these settings later from the media library.'}
                {mode === 'edit' && 'Changes will apply to all playlists using this image.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || isUploading}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'upload' ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              mode === 'upload' ? 'Set Duration & Upload' : 'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}