"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Card, CardContent } from "./ui/card";
import { Clock, Image as ImageIcon } from "lucide-react";

interface ImageDurationModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (duration: number) => void;
}

export function ImageDurationModal({ file, isOpen, onClose, onConfirm }: ImageDurationModalProps) {
  const [duration, setDuration] = useState([10]); // Default 10 seconds
  const [customDuration, setCustomDuration] = useState("");

  if (!file) return null;

  const previewUrl = URL.createObjectURL(file);

  const handleConfirm = () => {
    const finalDuration = customDuration ? parseInt(customDuration) : duration[0];
    if (finalDuration > 0) {
      onConfirm(finalDuration);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Set Image Display Duration
          </DialogTitle>
          <DialogDescription>
            Configure how long this image should be displayed in playlists
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
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium">{file.name}</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Size: {formatFileSize(file.size)}</p>
                    <p>Type: {file.type}</p>
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
            </div>
          </div>

          {/* Preview Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Playlist Preview</span>
              </div>
              <p className="text-sm text-muted-foreground">
                This image will display for <strong>{customDuration || duration[0]} seconds</strong> when 
                included in a playlist. You can always change this duration later from the media library.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Set Duration & Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}