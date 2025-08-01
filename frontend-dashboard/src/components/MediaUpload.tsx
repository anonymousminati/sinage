"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Upload, 
  File, 
  Image, 
  Video, 
  X, 
  CheckCircle, 
  AlertTriangle,
  FileType
} from "lucide-react";
import { toast } from "sonner";

interface MediaUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function MediaUpload({ isOpen, onClose, onUpload }: MediaUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const acceptedTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/mov', 'video/avi'],
    other: ['application/pdf', 'text/plain']
  };

  const maxFileSize = 100 * 1024 * 1024; // 100MB

  const validateFile = (file: File): string | null => {
    const allAcceptedTypes = [...acceptedTypes.image, ...acceptedTypes.video, ...acceptedTypes.other];
    
    if (!allAcceptedTypes.includes(file.type)) {
      return `File type "${file.type}" is not supported`;
    }
    
    if (file.size > maxFileSize) {
      return `File size exceeds 100MB limit`;
    }
    
    return null;
  };

  const getFileIcon = (file: File) => {
    if (acceptedTypes.image.includes(file.type)) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    if (acceptedTypes.video.includes(file.type)) {
      return <Video className="h-8 w-8 text-purple-500" />;
    }
    return <FileType className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploadFiles: UploadFile[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      newUploadFiles.push({
        file,
        status: error ? 'error' : 'pending',
        progress: 0,
        error
      });
    });

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      addFiles(files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const simulateUpload = async (file: UploadFile, index: number) => {
    // Simulate upload progress
    setUploadFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'uploading' } : f
    ));

    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress } : f
      ));
    }

    setUploadFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'success', progress: 100 } : f
    ));
  };

  const handleUpload = async () => {
    const validFiles = uploadFiles.filter(f => f.status === 'pending');
    
    if (validFiles.length === 0) {
      toast.error("No valid files to upload");
      return;
    }

    // Simulate upload for each file
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      if (file.status === 'pending') {
        await simulateUpload(file, i);
      }
    }

    // Call the onUpload callback with successful files
    const successfulFiles = uploadFiles
      .filter(f => f.status === 'success')
      .map(f => f.file);
    
    onUpload(successfulFiles);
    toast.success(`Successfully uploaded ${successfulFiles.length} file(s)`);
    
    // Clear the upload list after a short delay
    setTimeout(() => {
      setUploadFiles([]);
      onClose();
    }, 1000);
  };

  const validFilesCount = uploadFiles.filter(f => f.status !== 'error').length;
  const errorFilesCount = uploadFiles.filter(f => f.status === 'error').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload Media Files</DialogTitle>
          <DialogDescription>
            Upload images, videos, and other content for your digital signage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Drop files here or click to browse</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: JPEG, PNG, GIF, WebP, MP4, WebM, MOV, AVI, PDF
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Maximum file size: 100MB per file
            </p>
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.txt"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                Select Files
              </label>
            </Button>
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Files to Upload</h4>
                <div className="text-sm text-muted-foreground">
                  {validFilesCount} valid, {errorFilesCount} errors
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploadFiles.map((uploadFile, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {getFileIcon(uploadFile.file)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {uploadFile.file.name}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadFile.file.size)}
                      </p>

                      {uploadFile.status === 'error' && uploadFile.error && (
                        <p className="text-xs text-destructive mt-1">
                          {uploadFile.error}
                        </p>
                      )}

                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="mt-2 h-1" />
                      )}
                    </div>

                    <div className="flex items-center">
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Info */}
          {uploadFiles.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Images will prompt for display duration after upload. Videos will use their native duration.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={validFilesCount === 0}
          >
            Upload {validFilesCount} File{validFilesCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}