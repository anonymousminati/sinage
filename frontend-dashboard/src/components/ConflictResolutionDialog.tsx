/**
 * Conflict Resolution Dialog Component
 * 
 * This component handles conflicts when multiple users edit the same playlist
 * simultaneously. It provides options to:
 * - Accept local changes (keep your changes)
 * - Accept remote changes (accept other user's changes)
 * - View differences and merge manually
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  AlertTriangle, 
  User, 
  Clock, 
  FileText, 
  ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: {
    hasConflict: boolean;
    conflictingUserId?: string;
    conflictingUserEmail?: string;
    localVersion?: any;
    remoteVersion?: any;
    conflictType?: 'metadata' | 'items' | 'assignment';
  };
  onResolve: (resolution: 'accept_local' | 'accept_remote' | 'merge') => void;
}

export function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflictData,
  onResolve,
}: ConflictResolutionDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<string>('accept_remote');

  const handleResolve = () => {
    onResolve(selectedResolution as 'accept_local' | 'accept_remote' | 'merge');
    toast.success('Conflict resolved successfully');
    onClose();
  };

  const getConflictTypeLabel = (type?: string) => {
    switch (type) {
      case 'metadata':
        return 'Playlist Information';
      case 'items':
        return 'Playlist Items';
      case 'assignment':
        return 'Screen Assignment';
      default:
        return 'Playlist Data';
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown time';
    return new Date(timestamp).toLocaleString();
  };

  const renderChanges = (version: any, label: string) => {
    if (!version) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">{label}</span>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(version, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  if (!conflictData.hasConflict) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Playlist Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Multiple users have modified this playlist simultaneously. Please choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Information */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {conflictData.conflictingUserEmail || 'Unknown User'}
                  </span>
                  <span className="text-muted-foreground">modified</span>
                  <Badge variant="outline">
                    {getConflictTypeLabel(conflictData.conflictType)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Conflict detected at {formatTimestamp(new Date().toISOString())}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-4">
            <h3 className="font-semibold">Choose Resolution</h3>
            
            <div className="grid gap-3">
              {/* Accept Remote Changes */}
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedResolution === 'accept_remote' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedResolution('accept_remote')}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    checked={selectedResolution === 'accept_remote'}
                    onChange={() => setSelectedResolution('accept_remote')}
                    className="text-primary"
                  />
                  <div>
                    <div className="font-medium">Accept their changes (Recommended)</div>
                    <div className="text-sm text-muted-foreground">
                      Use the changes made by {conflictData.conflictingUserEmail || 'the other user'} and discard your changes
                    </div>
                  </div>
                </div>
              </div>

              {/* Keep Local Changes */}
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedResolution === 'accept_local' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedResolution('accept_local')}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    checked={selectedResolution === 'accept_local'}
                    onChange={() => setSelectedResolution('accept_local')}
                    className="text-primary"
                  />
                  <div>
                    <div className="font-medium">Keep your changes</div>
                    <div className="text-sm text-muted-foreground">
                      Keep your local changes and ignore the changes made by the other user
                    </div>
                  </div>
                </div>
              </div>

              {/* Merge Changes */}
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors opacity-60 ${
                  selectedResolution === 'merge' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedResolution('merge')}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    checked={selectedResolution === 'merge'}
                    onChange={() => setSelectedResolution('merge')}
                    className="text-primary"
                    disabled
                  />
                  <div>
                    <div className="font-medium">Merge changes</div>
                    <div className="text-sm text-muted-foreground">
                      Combine both changes manually (Coming soon)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Changes Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold">Changes Preview</h3>
            <ScrollArea className="max-h-60 border rounded-lg">
              <div className="p-4 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    {renderChanges(conflictData.localVersion, 'Your Changes')}
                  </div>
                  <div className="hidden md:flex items-center justify-center">
                    <ChevronRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    {renderChanges(conflictData.remoteVersion, 'Their Changes')}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={!selectedResolution}>
            Resolve Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictResolutionDialog;