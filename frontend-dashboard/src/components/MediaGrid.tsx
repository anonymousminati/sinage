"use client";

import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { type MediaFile } from "./MediaLibrary";
import { 
  MoreVertical, 
  Play, 
  Eye, 
  Download, 
  Edit, 
  Trash2, 
  Clock, 
  Calendar,
  HardDrive,
  Image,
  Video,
  FileText
} from "lucide-react";

interface MediaGridProps {
  files: MediaFile[];
  viewMode: "grid" | "list";
  onPreview: (file: MediaFile) => void;
  onDelete: (id: string) => void;
}

export function MediaGrid({ files, viewMode, onPreview, onDelete }: MediaGridProps) {
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
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <HardDrive className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No media files found</h3>
          <p className="text-muted-foreground mb-4">
            Upload your first media files to get started with your digital signage content.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === "list") {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4">Preview</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Size</th>
                  <th className="text-left p-4">Duration</th>
                  <th className="text-left p-4">Upload Date</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="relative w-12 h-12 rounded border overflow-hidden bg-muted">
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        {file.type === 'video' && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Play className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium truncate max-w-48">{file.name}</p>
                        {file.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {file.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {file.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{file.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span className="text-sm">{file.format}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{formatFileSize(file.size)}</td>
                    <td className="p-4 text-sm">
                      {file.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(file.duration)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(file.uploadDate)}
                      </div>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onPreview(file)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => onDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {files.map((file) => (
        <Card key={file.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              
              {file.type === 'video' && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-8 w-8 text-white" />
                </div>
              )}

              {file.duration && (
                <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded">
                  {formatDuration(file.duration)}
                </div>
              )}

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPreview(file)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => onDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-medium truncate flex-1">{file.name}</h4>
                <div className="flex items-center gap-1 text-muted-foreground">
                  {getFileIcon(file.type)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{file.format}</span>
                </div>
                
                {file.dimensions && (
                  <div className="text-xs text-muted-foreground">
                    {file.dimensions.width} × {file.dimensions.height}
                  </div>
                )}

                {file.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {file.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs py-0">
                        {tag}
                      </Badge>
                    ))}
                    {file.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs py-0">
                        +{file.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}