"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Checkbox } from "./ui/checkbox";
import { 
  Trash2, 
  AlertTriangle, 
  FileX, 
  Monitor,
  Calendar,
  HardDrive,
  Loader2,
  CheckCircle2,
  Info
} from "lucide-react";
import type { MediaItem } from "../types";
import { useMediaActions, useMediaError } from "../stores/useMediaStore";

interface ConfirmDeleteModalProps {
  media: MediaItem | MediaItem[] | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ConfirmDeleteModal({ media, isOpen, onClose }: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [deletionErrors, setDeletionErrors] = useState<string[]>([]);
  
  const { deleteMedia } = useMediaActions();
  const storeError = useMediaError();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
      setDeleteSuccess(false);
      setConfirmationChecked(false);
      setDeletionErrors([]);
    }
  }, [isOpen]);

  if (!media) return null;

  const mediaItems = Array.isArray(media) ? media : [media];
  const isBulkDelete = Array.isArray(media);
  const totalSize = mediaItems.reduce((sum, item) => sum + item.fileSize, 0);
  const totalUsage = mediaItems.reduce((sum, item) => sum + item.usageCount, 0);
  const hasActiveMedia = mediaItems.some(item => item.isActive);
  const hasUsedMedia = mediaItems.some(item => item.usageCount > 0);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeletionErrors([]);
    
    try {
      if (isBulkDelete) {
        // Handle bulk deletion
        const errors: string[] = [];
        
        for (const item of mediaItems) {
          try {
            await deleteMedia(item._id);
          } catch (error) {
            errors.push(`Failed to delete ${item.originalName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        if (errors.length > 0) {
          setDeletionErrors(errors);
          return;
        }
      } else {
        // Handle single deletion
        await deleteMedia(mediaItems[0]._id);
      }
      
      setDeleteSuccess(true);
      
      // Close modal after brief success display
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      // Single deletion error is handled by the store
    } finally {
      setIsDeleting(false);
    }
  };

  const getWarningLevel = () => {
    if (hasUsedMedia || hasActiveMedia) return 'high';
    if (totalSize > 50 * 1024 * 1024) return 'medium'; // > 50MB
    return 'low';
  };

  const warningLevel = getWarningLevel();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {isBulkDelete 
              ? `Delete ${mediaItems.length} Media Files`
              : 'Delete Media File'
            }
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The media file{isBulkDelete ? 's' : ''} will be permanently deleted from your library and cloud storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Alert */}
          {deleteSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Media file{isBulkDelete ? 's' : ''} deleted successfully! Closing modal...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alerts */}
          {storeError && !deleteSuccess && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{storeError}</AlertDescription>
            </Alert>
          )}

          {deletionErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Some files could not be deleted:</p>
                  {deletionErrors.map((error, index) => (
                    <p key={index} className="text-sm">{error}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning Alert */}
          {(hasUsedMedia || hasActiveMedia) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">⚠️ Warning: This media is currently in use!</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {hasActiveMedia && (
                      <li>This media is currently active in your library</li>
                    )}
                    {hasUsedMedia && (
                      <li>This media is used in {totalUsage} playlist{totalUsage > 1 ? 's' : ''}</li>
                    )}
                    <li>Deleting it may cause playlists to display incorrectly</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Media Preview */}
          {!isBulkDelete ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-32 h-24 rounded border overflow-hidden bg-muted flex-shrink-0">
                    {mediaItems[0].type === 'image' ? (
                      <img
                        src={mediaItems[0].secureUrl}
                        alt={mediaItems[0].originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={mediaItems[0].secureUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium">{mediaItems[0].originalName}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={mediaItems[0].type === 'image' ? 'default' : 'secondary'}>
                        {mediaItems[0].type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {mediaItems[0].format.toUpperCase()}
                      </Badge>
                      {mediaItems[0].isActive && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Size: {formatFileSize(mediaItems[0].fileSize)}</p>
                      <p>Created: {formatDate(mediaItems[0].createdAt)}</p>
                      <p>Used in: {mediaItems[0].usageCount} playlist{mediaItems[0].usageCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Selected Files for Deletion</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {mediaItems.slice(0, 5).map((item, index) => (
                    <div key={item._id} className="flex items-center gap-3 text-sm">
                      <div className="w-12 h-9 rounded border overflow-hidden bg-muted flex-shrink-0">
                        {item.type === 'image' ? (
                          <img
                            src={item.secureUrl}
                            alt={item.originalName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={item.secureUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.originalName}</p>
                        <p className="text-muted-foreground">
                          {formatFileSize(item.fileSize)} • {item.usageCount} playlist{item.usageCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant={item.type === 'image' ? 'default' : 'secondary'} className="text-xs">
                          {item.type.toUpperCase()}
                        </Badge>
                        {item.isActive && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {mediaItems.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ... and {mediaItems.length - 5} more file{mediaItems.length - 5 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deletion Impact Summary */}
          <Card className="border-destructive/20">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Deletion Impact
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileX className="h-4 w-4 text-muted-foreground" />
                    <span>Files to delete: <strong>{mediaItems.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span>Storage freed: <strong>{formatFileSize(totalSize)}</strong></span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span>Playlist usage: <strong>{totalUsage}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Warning level: <strong className={
                      warningLevel === 'high' ? 'text-destructive' :
                      warningLevel === 'medium' ? 'text-amber-600' : 'text-green-600'
                    }>{warningLevel.toUpperCase()}</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Checkbox */}
          <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="confirm-delete"
              checked={confirmationChecked}
              onCheckedChange={(checked) => setConfirmationChecked(checked === true)}
            />
            <label
              htmlFor="confirm-delete"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand that this action cannot be undone and will permanently delete the selected media file{isBulkDelete ? 's' : ''} from my library and cloud storage.
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={!confirmationChecked || isDeleting || deleteSuccess}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {isBulkDelete ? `${mediaItems.length} Files` : 'File'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}