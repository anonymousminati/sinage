
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { MediaUpload } from "./MediaUpload";
import { MediaGrid } from "./MediaGrid";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { ImageDurationModal } from "./ImageDurationModal";
import { 
  Search, 
  Filter, 
  Upload, 
  Image, 
  Video, 
  FileText,
  Calendar,
  HardDrive,
  Grid,
  List
} from "lucide-react";

export interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'other';
  format: string;
  size: number;
  dimensions?: { width: number; height: number };
  duration?: number; // for videos and image display duration
  uploadDate: string;
  thumbnailUrl: string;
  fileUrl: string;
  tags: string[];
}

export function MediaLibrary() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([
    {
      id: "1",
      name: "company-logo.png",
      type: "image",
      format: "PNG",
      size: 2.5 * 1024 * 1024,
      dimensions: { width: 1920, height: 1080 },
      duration: 10,
      uploadDate: "2024-08-01T10:30:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1920&h=1080&fit=crop",
      tags: ["logo", "branding"]
    },
    {
      id: "2",
      name: "holiday-promotion.mp4",
      type: "video",
      format: "MP4",
      size: 45.2 * 1024 * 1024,
      dimensions: { width: 1920, height: 1080 },
      duration: 30,
      uploadDate: "2024-07-28T14:15:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&h=1080&fit=crop",
      tags: ["promotion", "holiday", "sale"]
    },
    {
      id: "3",
      name: "office-background.jpg",
      type: "image",
      format: "JPEG",
      size: 8.1 * 1024 * 1024,
      dimensions: { width: 3840, height: 2160 },
      duration: 15,
      uploadDate: "2024-07-25T09:20:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=3840&h=2160&fit=crop",
      tags: ["background", "office"]
    },
    {
      id: "4",
      name: "product-showcase.mp4",
      type: "video",
      format: "MP4",
      size: 67.8 * 1024 * 1024,
      dimensions: { width: 1920, height: 1080 },
      duration: 45,
      uploadDate: "2024-07-20T16:45:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&h=1080&fit=crop",
      tags: ["product", "showcase", "demo"]
    },
    {
      id: "5",
      name: "team-photo.png",
      type: "image",
      format: "PNG",
      size: 12.3 * 1024 * 1024,
      dimensions: { width: 2560, height: 1440 },
      duration: 8,
      uploadDate: "2024-07-15T11:30:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=2560&h=1440&fit=crop",
      tags: ["team", "people", "company"]
    },
    {
      id: "6",
      name: "weather-widget.mp4",
      type: "video",
      format: "MP4",
      size: 23.7 * 1024 * 1024,
      dimensions: { width: 1280, height: 720 },
      duration: 60,
      uploadDate: "2024-07-10T13:20:00Z",
      thumbnailUrl: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=400&h=300&fit=crop",
      fileUrl: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1280&h=720&fit=crop",
      tags: ["weather", "widget", "information"]
    }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const filteredFiles = mediaFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === "all" || file.type === typeFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const fileDate = new Date(file.uploadDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case "today":
          matchesDate = daysDiff === 0;
          break;
        case "week":
          matchesDate = daysDiff <= 7;
          break;
        case "month":
          matchesDate = daysDiff <= 30;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  const handleFileUpload = (files: File[]) => {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        setPendingImageFile(file);
      } else {
        // For videos and other files, add directly
        addMediaFile(file);
      }
    });
  };

  const addMediaFile = (file: File, duration?: number) => {
    const newFile: MediaFile = {
      id: Date.now().toString(),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other',
      format: file.name.split('.').pop()?.toUpperCase() || '',
      size: file.size,
      duration: duration || (file.type.startsWith('video/') ? 30 : undefined), // Default video duration
      uploadDate: new Date().toISOString(),
      thumbnailUrl: URL.createObjectURL(file),
      fileUrl: URL.createObjectURL(file),
      tags: []
    };

    setMediaFiles(prev => [newFile, ...prev]);
  };

  const handleImageDurationSet = (duration: number) => {
    if (pendingImageFile) {
      addMediaFile(pendingImageFile, duration);
      setPendingImageFile(null);
    }
  };

  const deleteMediaFile = (id: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== id));
  };

  const totalSize = mediaFiles.reduce((acc, file) => acc + file.size, 0);
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Media Library</h1>
          <p className="text-muted-foreground">
            Manage your digital signage content and media files
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Media
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-lg font-semibold">{mediaFiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Images</p>
                <p className="text-lg font-semibold">
                  {mediaFiles.filter(f => f.type === 'image').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Videos</p>
                <p className="text-lg font-semibold">
                  {mediaFiles.filter(f => f.type === 'video').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-lg font-semibold">{formatFileSize(totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search media files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
              </Badge>
              
              <div className="border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none border-l"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid */}
      <MediaGrid
        files={filteredFiles}
        viewMode={viewMode}
        onPreview={setSelectedMedia}
        onDelete={deleteMediaFile}
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
        onClose={() => setSelectedMedia(null)}
      />

      {/* Image Duration Modal */}
      <ImageDurationModal
        file={pendingImageFile}
        isOpen={!!pendingImageFile}
        onClose={() => setPendingImageFile(null)}
        onConfirm={handleImageDurationSet}
      />
    </div>
  );
}