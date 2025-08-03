import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { 
  MoreVertical, 
  Play, 
  Eye, 
  Download, 
  Edit, 
  Trash2, 
  Clock, 
  Calendar,
  Image,
  Video,
  FileText,
  TrendingUp
} from "lucide-react";
import type { MediaItem } from "../types";

/**
 * MediaCard Component
 * 
 * Reusable card component for displaying media items in both grid and list layouts.
 * Provides hover actions, metadata display, and consistent styling.
 */

interface MediaCardProps {
  file: MediaItem;
  layout: "grid" | "list";
  onPreview: (file: MediaItem) => void;
  onDownload: (file: MediaItem) => void;
  onEdit?: (file: MediaItem) => void;
  onDelete: (file: MediaItem) => void;
  className?: string;
}

export function MediaCard({ 
  file, 
  layout, 
  onPreview, 
  onDownload, 
  onEdit, 
  onDelete,
  className = ""
}: MediaCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
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

  const ActionMenu = ({ className: menuClassName = "" }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className={`h-6 w-6 p-0 ${menuClassName}`}>
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onPreview(file)}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload(file)}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </DropdownMenuItem>
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(file)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          className="text-destructive"
          onClick={() => onDelete(file)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (layout === "list") {
    return (
      <tr className={`border-b hover:bg-muted/50 transition-colors ${className}`}>
        <td className="p-4">
          <div className="relative w-12 h-12 rounded border overflow-hidden bg-muted">
            <img
              src={file.secureUrl}
              alt={file.originalName}
              className="w-full h-full object-cover"
              loading="lazy"
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
            <p className="font-medium truncate max-w-48" title={file.originalName}>
              {file.originalName}
            </p>
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
        <td className="p-4 text-sm">{file.formattedFileSize}</td>
        <td className="p-4 text-sm">
          {file.formattedDuration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {file.formattedDuration}
            </div>
          )}
        </td>
        <td className="p-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(file.createdAt)}
          </div>
        </td>
        <td className="p-4">
          <ActionMenu />
        </td>
      </tr>
    );
  }

  return (
    <Card className={`group hover:shadow-md transition-all duration-200 ${className}`}>
      <CardContent className="p-0">
        <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
          <img
            src={file.secureUrl}
            alt={file.originalName}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
          
          {file.type === 'video' && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Play className="h-8 w-8 text-white" />
            </div>
          )}

          {file.formattedDuration && (
            <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded">
              {file.formattedDuration}
            </div>
          )}

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ActionMenu />
          </div>

          {/* Click overlay for preview */}
          <button
            onClick={() => onPreview(file)}
            className="absolute inset-0 bg-transparent hover:bg-black/10 transition-colors duration-200 cursor-pointer"
            aria-label={`Preview ${file.originalName}`}
          />
        </div>

        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 
              className="text-sm font-medium truncate flex-1" 
              title={file.originalName}
            >
              {file.originalName}
            </h4>
            <div className="flex items-center gap-1 text-muted-foreground">
              {getFileIcon(file.type)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{file.formattedFileSize}</span>
              <span className="uppercase">{file.format}</span>
            </div>
            
            {file.width && file.height && (
              <div className="text-xs text-muted-foreground">
                {file.width} × {file.height}
                {file.aspectRatio && (
                  <span className="ml-2 text-muted-foreground/70">
                    ({file.aspectRatio})
                  </span>
                )}
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

            {/* Usage count indicator */}
            {file.usageCount > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                Used {file.usageCount} {file.usageCount === 1 ? 'time' : 'times'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}