
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { type MediaFile } from "./MediaLibrary";
import { 
  Download, 
  Edit, 
  Trash2, 
  Clock, 
  Calendar, 
  HardDrive, 
  Monitor,
  Tag,
  Image as ImageIcon,
  Video,
  FileText
} from "lucide-react";

interface MediaPreviewModalProps {
  media: MediaFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaPreviewModal({ media, isOpen, onClose }: MediaPreviewModalProps) {
  if (!media) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Not set';
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds === 0 ? `${minutes} minutes` : `${minutes} minutes ${remainingSeconds} seconds`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(media.type)}
            {media.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[70vh]">
          {/* Preview */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {media.type === 'image' ? (
                    <img
                      src={media.fileUrl}
                      alt={media.name}
                      className="w-full h-full object-contain"
                    />
                  ) : media.type === 'video' ? (
                    <video
                      src={media.fileUrl}
                      controls
                      className="w-full h-full"
                      poster={media.thumbnailUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4" />
                      <p>Preview not available for this file type</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Details
              </Button>
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* File Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">File Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">File Name</p>
                  <p className="font-medium">{media.name}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Format</p>
                  <Badge variant="outline">{media.format}</Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">File Size</p>
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatFileSize(media.size)}</span>
                  </div>
                </div>

                {media.dimensions && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dimensions</p>
                    <div className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      <span>{media.dimensions.width} × {media.dimensions.height}</span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Upload Date</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{formatDate(media.uploadDate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Playback Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Playback Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Display Duration</p>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(media.duration)}</span>
                  </div>
                  {media.type === 'image' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      How long this image displays in playlists
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Content Type</p>
                  <div className="flex items-center gap-2">
                    {getFileIcon(media.type)}
                    <span className="capitalize">{media.type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {media.tags.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {media.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags added</p>
                )}
              </CardContent>
            </Card>

            {/* Usage Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Used in Playlists</p>
                    <p className="text-sm">0 playlists</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Plays</p>
                    <p className="text-sm">0 times</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Played</p>
                    <p className="text-sm">Never</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}