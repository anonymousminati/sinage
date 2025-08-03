
import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { MediaStats } from "./MediaStats";
import { MediaFilters } from "./MediaFilters";
import { MediaGrid } from "./MediaGrid";
import { MediaUpload } from "./MediaUpload";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { ImageDurationModal } from "./ImageDurationModal";
import { 
  Upload, 
  AlertTriangle,
  X,
  RefreshCw
} from "lucide-react";
import { 
  useMediaItems,
  useMediaLoading,
  useMediaError,
  useSelectedMedia,
  useUploading,
  useUploadProgress,
  useMediaActions
} from "../stores/useMediaStore";
import { toast } from "sonner";

export function MediaLibrary() {
  // Store state
  const mediaFiles = useMediaItems();
  const isLoading = useMediaLoading();
  const error = useMediaError();
  const selectedMedia = useSelectedMedia();
  const isUploading = useUploading();
  const uploadProgress = useUploadProgress();
  
  // Store actions - get them individually to avoid object recreation
  const actions = useMediaActions();
  
  // Local UI state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  // Initialize data on component mount
  useEffect(() => {
    actions.fetchMedia();
    actions.fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        // For images, prompt for duration first
        setPendingImageFile(file);
      } else {
        // For videos, upload directly
        try {
          await actions.uploadMedia(file);
          toast.success(`Uploaded ${file.name} successfully`);
        } catch (error) {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    }
    setShowUpload(false);
  };

  // Handle image duration setting
  const handleImageDurationSet = async (duration: number, tags?: string, description?: string) => {
    if (pendingImageFile) {
      try {
        await actions.uploadMedia(pendingImageFile, {
          duration,
          tags,
          description
        });
        toast.success(`Uploaded ${pendingImageFile.name} successfully`);
      } catch (error) {
        toast.error(`Failed to upload ${pendingImageFile.name}`);
      }
      setPendingImageFile(null);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    actions.invalidateCache();
    await actions.fetchMedia();
    await actions.fetchStats();
    toast.success('Media library refreshed');
  };

  // Loading skeleton for header
  const HeaderSkeleton = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="h-6 w-6 p-0 ml-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      {isLoading && mediaFiles.length === 0 ? (
        <HeaderSkeleton />
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Media Library</h1>
            <p className="text-muted-foreground">
              Manage your digital signage content and media files
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setShowUpload(true)} 
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Media'}
            </Button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Upload Progress</h3>
            <div className="space-y-2">
              {Object.values(uploadProgress).map((progress) => (
                <div key={progress.fileId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{progress.filename}</span>
                      <span className="text-muted-foreground">
                        {progress.status === 'uploading' ? `${progress.progress}%` : progress.status}
                      </span>
                    </div>
                    {progress.status === 'uploading' && (
                      <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                    )}
                    {progress.error && (
                      <p className="text-xs text-destructive mt-1">{progress.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <MediaStats />

      {/* Filters */}
      <MediaFilters
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        resultCount={mediaFiles.length}
      />

      {/* Media Grid */}
      <MediaGrid
        files={mediaFiles}
        viewMode={viewMode}
        onPreview={actions.setSelectedMedia}
      />

      {/* Upload Modal */}
      <MediaUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleFileUpload}
      />

      {/* Preview Modal */}
      <MediaPreviewModal
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => actions.setSelectedMedia(null)}
      />

      {/* Image Duration Modal */}
      <ImageDurationModal
        file={pendingImageFile}
        isOpen={!!pendingImageFile}
        onClose={() => {
          setPendingImageFile(null);
        }}
        onConfirm={handleImageDurationSet}
      />
    </div>
  );
}