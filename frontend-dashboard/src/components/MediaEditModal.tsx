"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { 
  Save, 
  X, 
  Clock, 
  Tag as TagIcon, 
  FileText, 
  Image as ImageIcon,
  Video,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import type { MediaItem } from "../types";
import { useMediaActions, useMediaError } from "../stores/useMediaStore";

interface MediaEditModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  duration?: number;
  tags: string;
  description: string;
}

interface FormErrors {
  duration?: string;
  tags?: string;
  description?: string;
}

export function MediaEditModal({ media, isOpen, onClose }: MediaEditModalProps) {
  const [formData, setFormData] = useState<FormData>({
    duration: undefined,
    tags: '',
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [customDuration, setCustomDuration] = useState("");
  const [durationSlider, setDurationSlider] = useState([10]);

  const { updateMedia } = useMediaActions();
  const storeError = useMediaError();

  // Initialize form data when media changes
  useEffect(() => {
    if (media && isOpen) {
      const initialData: FormData = {
        duration: media.duration,
        tags: media.tags.join(', '),
        description: media.description || ''
      };
      
      setFormData(initialData);
      setDurationSlider([media.duration || 10]);
      setCustomDuration('');
      setErrors({});
      setHasUnsavedChanges(false);
      setSubmitSuccess(false);
    }
  }, [media, isOpen]);

  // Track changes
  useEffect(() => {
    if (media) {
      const hasChanges = (
        formData.duration !== media.duration ||
        formData.tags !== media.tags.join(', ') ||
        formData.description !== (media.description || '')
      );
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, media]);

  if (!media) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate duration for images
    if (media.type === 'image') {
      const duration = customDuration ? parseInt(customDuration) : durationSlider[0];
      if (!duration || duration < 1) {
        newErrors.duration = 'Duration must be at least 1 second';
      } else if (duration > 3600) {
        newErrors.duration = 'Duration cannot exceed 1 hour (3600 seconds)';
      }
    }

    // Validate tags
    if (formData.tags.trim()) {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tags.length > 20) {
        newErrors.tags = 'Maximum 20 tags allowed';
      }
      
      const invalidTags = tags.filter(tag => tag.length > 50);
      if (invalidTags.length > 0) {
        newErrors.tags = 'Each tag must be 50 characters or less';
      }
    }

    // Validate description
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const updateData: Partial<Pick<MediaItem, 'duration' | 'tags' | 'description'>> = {};

      // Handle duration for images
      if (media.type === 'image') {
        const duration = customDuration ? parseInt(customDuration) : durationSlider[0];
        updateData.duration = duration;
      }

      // Handle tags
      if (formData.tags.trim()) {
        const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        updateData.tags = tags;
      } else {
        updateData.tags = [];
      }

      // Handle description
      updateData.description = formData.description.trim() || undefined;

      await updateMedia(media._id, updateData);
      
      setSubmitSuccess(true);
      setHasUnsavedChanges(false);
      
      // Close modal after brief success display
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      // Error handling is managed by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges && !submitSuccess) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleForceClose = () => {
    setShowUnsavedWarning(false);
    onClose();
  };

  const handleDurationChange = (value: number[]) => {
    setDurationSlider(value);
    setCustomDuration('');
    setFormData(prev => ({ ...prev, duration: value[0] }));
  };

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    if (value) {
      const duration = parseInt(value) || 1;
      setDurationSlider([duration]);
      setFormData(prev => ({ ...prev, duration }));
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

  return (
    <>
      <Dialog open={isOpen && !showUnsavedWarning} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {media.type === 'image' ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <Video className="h-5 w-5" />
              )}
              Edit Media
            </DialogTitle>
            <DialogDescription>
              Update metadata and settings for this media file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Media Preview */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-32 h-24 rounded border overflow-hidden bg-muted flex-shrink-0">
                    {media.type === 'image' ? (
                      <img
                        src={media.secureUrl}
                        alt={media.originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={media.secureUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium">{media.originalName}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={media.type === 'image' ? 'default' : 'secondary'}>
                        {media.type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {media.format.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Size: {formatFileSize(media.fileSize)}</p>
                      {media.width && media.height && (
                        <p>Dimensions: {media.width} × {media.height}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Success Alert */}
            {submitSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Media updated successfully! Closing modal...
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {storeError && !submitSuccess && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{storeError}</AlertDescription>
              </Alert>
            )}

            {/* Duration Settings (Images only) */}
            {media.type === 'image' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Display Duration
                  </Label>
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
                        variant={durationSlider[0] === preset ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDurationChange([preset])}
                        type="button"
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
                      value={durationSlider}
                      onValueChange={handleDurationChange}
                      max={120}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1s</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {durationSlider[0]} second{durationSlider[0] !== 1 ? 's' : ''}
                      </span>
                      <span>120s</span>
                    </div>
                  </div>
                </div>

                {/* Custom Input */}
                <div className="space-y-2">
                  <Label htmlFor="customDuration" className="text-sm">Custom Duration</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="customDuration"
                      type="number"
                      placeholder="Enter seconds"
                      value={customDuration}
                      onChange={(e) => handleCustomDurationChange(e.target.value)}
                      min="1"
                      max="3600"
                      className="max-w-32"
                    />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                  {errors.duration && (
                    <p className="text-sm text-destructive">{errors.duration}</p>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Tags */}
            <div className="space-y-3">
              <Label htmlFor="tags" className="text-base font-medium flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                Tags
              </Label>
              <Input
                id="tags"
                placeholder="e.g., logo, promotion, background (comma separated)"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              />
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Separate multiple tags with commas (max 20 tags)
                </p>
                <span className="text-xs text-muted-foreground">
                  {formData.tags.split(',').filter(tag => tag.trim()).length}/20
                </span>
              </div>
              {errors.tags && (
                <p className="text-sm text-destructive">{errors.tags}</p>
              )}
              
              {/* Tag Preview */}
              {formData.tags.trim() && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.split(',').map((tag, index) => {
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

            {/* Description */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description of this media file..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Optional description to help organize your media
                </p>
                <span className="text-xs text-muted-foreground">
                  {formData.description.length}/500
                </span>
              </div>
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            {/* Preview Changes */}
            {hasUnsavedChanges && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Preview Changes</h4>
                  <div className="space-y-2 text-sm">
                    {media.type === 'image' && formData.duration !== media.duration && (
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{media.duration || 'Not set'} → {formData.duration}s</span>
                      </div>
                    )}
                    {formData.tags !== media.tags.join(', ') && (
                      <div className="flex justify-between">
                        <span>Tags:</span>
                        <span>{media.tags.length} → {formData.tags.split(',').filter(t => t.trim()).length}</span>
                      </div>
                    )}
                    {formData.description !== (media.description || '') && (
                      <div className="flex justify-between">
                        <span>Description:</span>
                        <span>{media.description ? 'Updated' : 'Added'}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !hasUnsavedChanges || submitSuccess}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning */}
      <Dialog open={showUnsavedWarning} onOpenChange={() => setShowUnsavedWarning(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUnsavedWarning(false)}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={handleForceClose}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}