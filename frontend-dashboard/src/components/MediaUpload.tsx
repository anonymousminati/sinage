"use client";

import React, { useState, useCallback, useRef } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { 
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import Webcam from "react-webcam";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { 
  Upload, 
  File, 
  Image, 
  Video, 
  X, 
  CheckCircle, 
  AlertTriangle,
  FileType,
  Clock,
  Tag,
  GripVertical,
  Camera,
  Link,
  Clipboard,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Edit
} from "lucide-react";
import { toast } from "sonner";
import { useMediaActions, useUploading } from "../stores/useMediaStore";
import type { MediaItem } from "../types";

// =============================================================================
// INTERFACES & TYPES
// =============================================================================

interface MediaUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (files: File[]) => void;
}

interface FileMetadata {
  duration?: number;
  tags: string[];
  description: string;
}

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  preview?: string;
  metadata: FileMetadata;
  isDuplicate?: boolean;
  fileSize: string;
  dimensions?: { width: number; height: number };
  uploadSpeed?: number;
  timeRemaining?: number;
  startTime?: number;
}

interface BatchMetadata {
  duration?: number;
  tags: string[];
  description: string;
  applyToAll: boolean;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const acceptedTypes = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/wmv', 'video/flv', 'video/mkv'],
};

const maxFileSizes = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
};

const durationPresets = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300];

const validateFile = (file: File, existingFiles: UploadFile[] = []): { isValid: boolean; error?: string; isDuplicate?: boolean } => {
  const allAcceptedTypes = [...acceptedTypes.image, ...acceptedTypes.video];
  
  if (!allAcceptedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `File type "${file.type}" is not supported. Supported formats: JPEG, PNG, GIF, WebP, MP4, WebM, MOV, AVI` 
    };
  }
  
  const isImage = acceptedTypes.image.includes(file.type);
  const maxSize = isImage ? maxFileSizes.image : maxFileSizes.video;
  
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File size (${formatFileSize(file.size)}) exceeds ${formatFileSize(maxSize)} limit for ${isImage ? 'image' : 'video'} files` 
    };
  }
  
  // Check for duplicates
  const isDuplicate = existingFiles.some(f => f.file.name === file.name && f.file.size === file.size);
  
  return { isValid: true, isDuplicate };
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (file: File, size: number = 24) => {
  const className = `h-${size/4} w-${size/4}`;
  
  if (acceptedTypes.image.includes(file.type)) {
    return <Image className={`${className} text-blue-500`} />;
  }
  if (acceptedTypes.video.includes(file.type)) {
    return <Video className={`${className} text-purple-500`} />;
  }
  return <FileType className={`${className} text-gray-500`} />;
};

const generatePreview = async (file: File): Promise<string | undefined> => {
  return new Promise((resolve) => {
    if (acceptedTypes.image.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    } else if (acceptedTypes.video.includes(file.type)) {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = 200;
        canvas.height = (video.videoHeight / video.videoWidth) * 200;
        video.currentTime = Math.min(video.duration * 0.1, 5); // 10% or 5 seconds
      };
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL());
        }
      };
      
      video.onerror = () => resolve(undefined);
      video.src = URL.createObjectURL(file);
    } else {
      resolve(undefined);
    }
  });
};

const extractDimensions = async (file: File): Promise<{ width: number; height: number } | undefined> => {
  return new Promise((resolve) => {
    if (acceptedTypes.image.includes(file.type)) {
      const img = document.createElement('img');
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src); // Clean up object URL
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src); // Clean up object URL
        resolve(undefined);
      };
      img.src = URL.createObjectURL(file);
    } else if (acceptedTypes.video.includes(file.type)) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        URL.revokeObjectURL(video.src); // Clean up object URL
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src); // Clean up object URL
        resolve(undefined);
      };
      video.src = URL.createObjectURL(file);
      video.load();
    } else {
      resolve(undefined);
    }
  });
};

const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

// =============================================================================
// SORTABLE FILE ITEM COMPONENT
// =============================================================================

interface SortableFileItemProps {
  uploadFile: UploadFile;
  onRemove: () => void;
  onUpdateMetadata: (metadata: Partial<FileMetadata>) => void;
  onPreview: () => void;
  showPreview: boolean;
}

const SortableFileItem: React.FC<SortableFileItemProps> = ({ 
  uploadFile, 
  onRemove, 
  onUpdateMetadata, 
  onPreview,
  showPreview 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: uploadFile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showMetadataEdit, setShowMetadataEdit] = useState(false);
  const [localMetadata, setLocalMetadata] = useState(uploadFile.metadata);

  const isImage = acceptedTypes.image.includes(uploadFile.file.type);
  const isVideo = acceptedTypes.video.includes(uploadFile.file.type);

  const handleTagsChange = (tagsStr: string) => {
    const tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const newMetadata = { ...localMetadata, tags };
    setLocalMetadata(newMetadata);
    onUpdateMetadata(newMetadata);
  };

  const handleMetadataChange = (field: keyof FileMetadata, value: any) => {
    const newMetadata = { ...localMetadata, [field]: value };
    setLocalMetadata(newMetadata);
    onUpdateMetadata(newMetadata);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-lg transition-all duration-200 ${
        isDragging ? 'shadow-lg border-primary' : 'shadow-sm hover:shadow-md'
      } ${uploadFile.isDuplicate ? 'border-orange-300 bg-orange-50' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div 
            {...attributes} 
            {...listeners}
            className="flex items-center justify-center w-6 h-6 mt-1 cursor-grab hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* File Icon or Preview */}
          <div className="relative">
            {showPreview && uploadFile.preview ? (
              <div className="w-16 h-16 rounded overflow-hidden border">
                <img 
                  src={uploadFile.preview} 
                  alt={uploadFile.file.name}
                  className="w-full h-full object-cover"
                />
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 flex items-center justify-center border rounded">
                {getFileIcon(uploadFile.file, 32)}
              </div>
            )}
          </div>

          {/* File Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium truncate max-w-[200px]" title={uploadFile.file.name}>
                  {uploadFile.file.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{uploadFile.fileSize}</span>
                  {uploadFile.dimensions && (
                    <span>• {uploadFile.dimensions.width}×{uploadFile.dimensions.height}</span>
                  )}
                  {uploadFile.isDuplicate && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      Duplicate
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPreview}
                  className="h-8 w-8 p-0"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMetadataEdit(!showMetadataEdit)}
                  className="h-8 w-8 p-0"
                  title="Edit metadata"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status and Progress */}
            <div className="mt-2">
              {uploadFile.status === 'error' && uploadFile.error && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{uploadFile.error}</span>
                </div>
              )}

              {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{uploadFile.status === 'uploading' ? 'Uploading...' : 'Processing...'}</span>
                    <span>{uploadFile.progress}%</span>
                  </div>
                  <Progress value={uploadFile.progress} className="h-1" />
                  {uploadFile.uploadSpeed && uploadFile.timeRemaining && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatSpeed(uploadFile.uploadSpeed)}</span>
                      <span>{formatTime(uploadFile.timeRemaining)} remaining</span>
                    </div>
                  )}
                </div>
              )}

              {uploadFile.status === 'success' && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Upload complete</span>
                </div>
              )}
            </div>

            {/* Metadata Display */}
            {!showMetadataEdit && (
              <div className="mt-2 space-y-1">
                {isImage && uploadFile.metadata.duration && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{uploadFile.metadata.duration}s duration</span>
                  </div>
                )}
                {uploadFile.metadata.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {uploadFile.metadata.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {uploadFile.metadata.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{uploadFile.metadata.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                {uploadFile.metadata.description && (
                  <p className="text-xs text-muted-foreground truncate" title={uploadFile.metadata.description}>
                    {uploadFile.metadata.description}
                  </p>
                )}
              </div>
            )}

            {/* Metadata Edit Form */}
            {showMetadataEdit && (
              <div className="mt-3 space-y-3 p-3 border rounded bg-muted/50">
                {isImage && (
                  <div>
                    <Label htmlFor={`duration-${uploadFile.id}`} className="text-xs">
                      Duration (seconds)
                    </Label>
                    <Input
                      id={`duration-${uploadFile.id}`}
                      type="number"
                      min="1"
                      max="300"
                      value={localMetadata.duration || ''}
                      onChange={(e) => handleMetadataChange('duration', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g., 15"
                      className="h-8 text-xs"
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor={`tags-${uploadFile.id}`} className="text-xs">
                    Tags (comma-separated)
                  </Label>
                  <Input
                    id={`tags-${uploadFile.id}`}
                    value={localMetadata.tags.join(', ')}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    placeholder="e.g., advertisement, outdoor, summer"
                    className="h-8 text-xs"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`description-${uploadFile.id}`} className="text-xs">
                    Description
                  </Label>
                  <Textarea
                    id={`description-${uploadFile.id}`}
                    value={localMetadata.description}
                    onChange={(e) => handleMetadataChange('description', e.target.value)}
                    placeholder="Brief description of the media..."
                    className="min-h-[60px] text-xs resize-none"
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground text-right mt-1">
                    {localMetadata.description.length}/500
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MediaUpload({ isOpen, onClose, onUpload }: MediaUploadProps) {
  // State Management
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState("upload");
  const [showWebcam, setShowWebcam] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [batchMetadata, setBatchMetadata] = useState<BatchMetadata>({
    duration: undefined,
    tags: [],
    description: "",
    applyToAll: false
  });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  // Store hooks
  const { uploadMedia } = useMediaActions();
  const uploading = useUploading();

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // =============================================================================
  // FILE MANAGEMENT FUNCTIONS
  // =============================================================================

  const createUploadFile = async (file: File): Promise<UploadFile> => {
    const validation = validateFile(file, uploadFiles);
    const preview = await generatePreview(file);
    const dimensions = await extractDimensions(file);
    
    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: validation.isValid ? 'pending' : 'error',
      progress: 0,
      error: validation.error,
      preview,
      metadata: {
        duration: acceptedTypes.image.includes(file.type) ? 15 : undefined,
        tags: [],
        description: ""
      },
      isDuplicate: validation.isDuplicate,
      fileSize: formatFileSize(file.size),
      dimensions
    };
  };

  const addFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploadFiles: UploadFile[] = [];

    for (const file of fileArray) {
      const uploadFile = await createUploadFile(file);
      newUploadFiles.push(uploadFile);
    }

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
    
    // Apply batch metadata if enabled
    if (batchMetadata.applyToAll && newUploadFiles.length > 0) {
      applyBatchMetadata(newUploadFiles.map(f => f.id));
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileMetadata = (id: string, metadata: Partial<FileMetadata>) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === id ? { ...f, metadata: { ...f.metadata, ...metadata } } : f
    ));
  };

  const applyBatchMetadata = (fileIds?: string[]) => {
    const targetIds = fileIds || uploadFiles.map(f => f.id);
    setUploadFiles(prev => prev.map(f => {
      if (!targetIds.includes(f.id)) return f;
      
      const isImage = acceptedTypes.image.includes(f.file.type);
      return {
        ...f,
        metadata: {
          ...f.metadata,
          ...(isImage && batchMetadata.duration ? { duration: batchMetadata.duration } : {}),
          ...(batchMetadata.tags.length > 0 ? { tags: [...batchMetadata.tags] } : {}),
          ...(batchMetadata.description ? { description: batchMetadata.description } : {})
        }
      };
    }));
  };

  // =============================================================================
  // DRAG AND DROP HANDLERS
  // =============================================================================

  const handleDragStart = (_event: DragStartEvent) => {
    // Optional: Add visual feedback for drag start
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Optional: Handle drag over events
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setUploadFiles((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      addFiles(files);
    }
  }, [uploadFiles, batchMetadata]);

  // =============================================================================
  // UPLOAD FUNCTIONS
  // =============================================================================

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', startTime: Date.now() } : f
      ));

      const result = await uploadMedia(uploadFile.file, {
        duration: uploadFile.metadata.duration,
        tags: uploadFile.metadata.tags.join(','),
        description: uploadFile.metadata.description
      });
      
      if (result) {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
        ));
        return result;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
      return null;
    }
  };

  const handleUpload = async () => {
    const validFiles = uploadFiles.filter(f => f.status === 'pending' && !f.isDuplicate);
    
    if (validFiles.length === 0) {
      toast.error("No valid files to upload");
      return;
    }

    const results: (MediaItem | null)[] = [];
    
    // Upload files sequentially to avoid overwhelming the server
    for (const uploadFile of validFiles) {
      const result = await uploadSingleFile(uploadFile);
      results.push(result);
    }

    const successCount = results.filter(r => r !== null).length;
    const failureCount = validFiles.length - successCount;

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`);
      if (onUpload) {
        onUpload(validFiles.map(f => f.file));
      }
    }
    
    if (failureCount > 0) {
      toast.error(`Failed to upload ${failureCount} file${failureCount !== 1 ? 's' : ''}`);
    }

    // Clear successful uploads after a delay
    setTimeout(() => {
      setUploadFiles(prev => prev.filter(f => f.status !== 'success'));
      if (successCount === validFiles.length) {
        onClose();
      }
    }, 2000);
  };

  // =============================================================================
  // ENHANCED FEATURES
  // =============================================================================

  const captureWebcam = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Convert base64 to File
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `webcam-capture-${Date.now()}.jpg`);
          addFiles([file]);
          setShowWebcam(false);
          toast.success("Image captured successfully");
        })
        .catch(() => {
          toast.error("Failed to capture image");
        });
    }
  }, []);

  const handleUrlImport = async () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      const response = await fetch(urlInput);
      const blob = await response.blob();
      const filename = urlInput.split('/').pop() || 'imported-file';
      const file = new File([blob], filename);
      
      await addFiles([file]);
      setUrlInput("");
      toast.success("File imported successfully");
    } catch (error) {
      toast.error("Failed to import file from URL");
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], `clipboard-image-${Date.now()}.png`);
            await addFiles([file]);
            toast.success("Image pasted from clipboard");
            return;
          }
        }
      }
      
      toast.error("No image found in clipboard");
    } catch (error) {
      toast.error("Failed to access clipboard");
    }
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const handleBatchTagsChange = (tagsStr: string) => {
    const tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setBatchMetadata(prev => ({ ...prev, tags }));
  };

  const clearAllFiles = () => {
    setUploadFiles([]);
  };

  const retryFailedUploads = () => {
    setUploadFiles(prev => prev.map(f => 
      f.status === 'error' ? { ...f, status: 'pending', error: undefined } : f
    ));
  };

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const errorFilesCount = uploadFiles.filter(f => f.status === 'error').length;
  const duplicateFilesCount = uploadFiles.filter(f => f.isDuplicate).length;
  const uploadingFilesCount = uploadFiles.filter(f => f.status === 'uploading' || f.status === 'processing').length;
  const pendingFilesCount = uploadFiles.filter(f => f.status === 'pending' && !f.isDuplicate).length;

  const totalSize = uploadFiles.reduce((sum, f) => sum + f.file.size, 0);
  const averageProgress = uploadFiles.length > 0 
    ? uploadFiles.reduce((sum, f) => sum + f.progress, 0) / uploadFiles.length 
    : 0;

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Media Files
          </DialogTitle>
          <DialogDescription>
            Upload images, videos, and other content for your digital signage
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="webcam" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Webcam
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="upload" className="h-full flex flex-col space-y-4 mt-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  isDragOver
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              >
                <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
                  isDragOver ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <h3 className="text-lg font-medium mb-2">
                  {isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Images: JPEG, PNG, GIF, WebP (max 10MB) • Videos: MP4, WebM, MOV, AVI (max 50MB)
                </p>
                
                <div className="flex items-center justify-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Select Files
                    </label>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePasteFromClipboard}
                    className="text-xs"
                  >
                    <Clipboard className="h-4 w-4 mr-1" />
                    Paste
                  </Button>
                </div>
              </div>

              {/* Batch Metadata Settings */}
              {uploadFiles.length > 1 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Batch Metadata</CardTitle>
                      <Switch
                        checked={batchMetadata.applyToAll}
                        onCheckedChange={(checked) => 
                          setBatchMetadata(prev => ({ ...prev, applyToAll: checked }))
                        }
                      />
                    </div>
                  </CardHeader>
                  {batchMetadata.applyToAll && (
                    <CardContent className="pt-0 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="batch-duration" className="text-xs">Duration (for images)</Label>
                          <div className="flex gap-1">
                            <Input
                              id="batch-duration"
                              type="number"
                              min="1"
                              max="300"
                              value={batchMetadata.duration || ''}
                              onChange={(e) => setBatchMetadata(prev => ({ 
                                ...prev, 
                                duration: e.target.value ? parseInt(e.target.value) : undefined 
                              }))}
                              placeholder="15"
                              className="h-8"
                            />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {durationPresets.slice(0, 4).map(preset => (
                              <Button
                                key={preset}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setBatchMetadata(prev => ({ ...prev, duration: preset }))}
                              >
                                {preset}s
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="batch-tags" className="text-xs">Tags</Label>
                          <Input
                            id="batch-tags"
                            value={batchMetadata.tags.join(', ')}
                            onChange={(e) => handleBatchTagsChange(e.target.value)}
                            placeholder="tag1, tag2, tag3"
                            className="h-8"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="batch-description" className="text-xs">Description</Label>
                          <Input
                            id="batch-description"
                            value={batchMetadata.description}
                            onChange={(e) => setBatchMetadata(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description..."
                            className="h-8"
                            maxLength={500}
                          />
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => applyBatchMetadata()}
                        className="w-full"
                      >
                        Apply to All Files
                      </Button>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* File List */}
              {uploadFiles.length > 0 && (
                <Card className="flex-1 flex flex-col min-h-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Files Queue ({uploadFiles.length})
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-xs"
                        >
                          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFiles}
                          className="text-xs text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Statistics */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{pendingFilesCount} pending</span>
                      {uploadingFilesCount > 0 && <span>{uploadingFilesCount} uploading</span>}
                      {errorFilesCount > 0 && <span className="text-destructive">{errorFilesCount} errors</span>}
                      {duplicateFilesCount > 0 && <span className="text-orange-600">{duplicateFilesCount} duplicates</span>}
                      <Separator orientation="vertical" className="h-3" />
                      <span>Total: {formatFileSize(totalSize)}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <SortableContext 
                          items={uploadFiles.map(f => f.id)} 
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {uploadFiles.map((uploadFile) => (
                              <SortableFileItem
                                key={uploadFile.id}
                                uploadFile={uploadFile}
                                onRemove={() => removeFile(uploadFile.id)}
                                onUpdateMetadata={(metadata) => updateFileMetadata(uploadFile.id, metadata)}
                                onPreview={() => {
                                  // Handle preview
                                  if (uploadFile.preview) {
                                    window.open(uploadFile.preview, '_blank');
                                  }
                                }}
                                showPreview={showPreview}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="webcam" className="h-full flex flex-col space-y-4 mt-4">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-sm">Webcam Capture</CardTitle>
                  <CardDescription>Capture images directly from your webcam</CardDescription>
                </CardHeader>
                <CardContent>
                  {showWebcam ? (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden">
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          className="w-full"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={captureWebcam} className="flex-1">
                          <Camera className="h-4 w-4 mr-2" />
                          Capture
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowWebcam(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Camera Access</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click the button below to start your webcam and capture images
                      </p>
                      <Button onClick={() => setShowWebcam(true)}>
                        <Camera className="h-4 w-4 mr-2" />
                        Start Webcam
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="import" className="h-full flex flex-col space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Import from URL</CardTitle>
                  <CardDescription>Import media files from external URLs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1"
                    />
                    <Button onClick={handleUrlImport} disabled={!urlInput.trim()}>
                      <Download className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Supported: Direct links to images and videos. The file must be publicly accessible.
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Clipboard Import</CardTitle>
                  <CardDescription>Import images from your clipboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handlePasteFromClipboard} className="w-full">
                    <Clipboard className="h-4 w-4 mr-2" />
                    Paste from Clipboard
                  </Button>
                  <div className="text-xs text-muted-foreground mt-2">
                    Copy an image to your clipboard and click the button above to import it.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t">
          {/* Upload Progress */}
          {uploadingFilesCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading {uploadingFilesCount} file{uploadingFilesCount !== 1 ? 's' : ''}...</span>
                <span>{Math.round(averageProgress)}%</span>
              </div>
              <Progress value={averageProgress} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              {errorFilesCount > 0 && (
                <Button variant="outline" size="sm" onClick={retryFailedUploads}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Retry Failed
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={pendingFilesCount === 0 || uploading}
                className="min-w-[120px]"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload {pendingFilesCount} File{pendingFilesCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}