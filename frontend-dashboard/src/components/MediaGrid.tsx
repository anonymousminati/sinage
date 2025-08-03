"use client";

import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { HardDrive } from "lucide-react";
import type { MediaItem } from "../types";
import { useMediaStore, useMediaActions, useMediaPagination, useMediaLoading } from "../stores/useMediaStore";
import { MediaCard } from "./MediaCard";
import { toast } from "sonner";

interface MediaGridProps {
  files: MediaItem[];
  viewMode: "grid" | "list";
  onPreview: (file: MediaItem) => void;
}

export function MediaGrid({ files, viewMode, onPreview }: MediaGridProps) {
  const { deleteMedia, downloadMedia } = useMediaActions();
  const pagination = useMediaPagination();
  const isLoading = useMediaLoading();

  // Handle delete with confirmation
  const handleDelete = async (file: MediaItem) => {
    if (window.confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      try {
        await deleteMedia(file._id);
        toast.success('Media file deleted successfully');
      } catch (error) {
        toast.error('Failed to delete media file');
      }
    }
  };

  // Handle download
  const handleDownload = async (file: MediaItem) => {
    try {
      const downloadUrl = await downloadMedia(file._id);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started');
      }
    } catch (error) {
      toast.error('Failed to download file');
    }
  };
  // Loading skeleton component
  const LoadingSkeleton = ({ count = 12 }: { count?: number }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <Skeleton className="aspect-video w-full rounded-t-lg" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-1">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Handle edit action (placeholder for future implementation)
  const handleEdit = (_file: MediaItem) => {
    // TODO: Implement edit functionality
    toast.info('Edit functionality coming soon');
  };

  // Pagination component
  const PaginationControls = () => {
    if (pagination.totalPages <= 1) return null;

    const handlePageChange = (page: number) => {
      // Use the store's setPage action instead
      useMediaStore.getState().setPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div className="flex justify-center items-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => pagination.hasPrev && handlePageChange(pagination.page - 1)}
                className={pagination.hasPrev ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              const isCurrentPage = page === pagination.page;
              
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={isCurrentPage}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            {pagination.totalPages > 5 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => pagination.hasNext && handlePageChange(pagination.page + 1)}
                className={pagination.hasNext ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };


  // Show loading skeleton while loading
  if (isLoading && files.length === 0) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  // Empty state
  if (!isLoading && files.length === 0) {
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


  return (
    <div className="space-y-6">
      {viewMode === "list" ? (
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
                    <MediaCard
                      key={file._id}
                      file={file}
                      layout="list"
                      onPreview={onPreview}
                      onDownload={handleDownload}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {files.map((file) => (
            <MediaCard
              key={file._id}
              file={file}
              layout="grid"
              onPreview={onPreview}
              onDownload={handleDownload}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      
      {/* Pagination */}
      <PaginationControls />
    </div>
  );
}