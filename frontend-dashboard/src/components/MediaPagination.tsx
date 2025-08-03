import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal
} from "lucide-react";
import { useMediaPagination, useMediaActions } from "../stores/useMediaStore";

interface MediaPaginationProps {
  className?: string;
}

export function MediaPagination({ className = "" }: MediaPaginationProps) {
  const pagination = useMediaPagination();
  const actions = useMediaActions();

  // Don't render if no data or only one page
  if (!pagination.total || pagination.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, hasNext, hasPrev, total, limit } = pagination;

  // Calculate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5; // Show max 5 page numbers
    
    if (totalPages <= showPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination logic
      if (page <= 3) {
        // Show first few pages
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        // Show last few pages
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show pages around current page
        pages.push(1);
        pages.push('ellipsis');
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Results Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Showing {startItem}-{endItem} of {total} files
        </span>
        {totalPages > 1 && (
          <Badge variant="outline" className="text-xs">
            Page {page} of {totalPages}
          </Badge>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* First Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.setPage(1)}
          disabled={page === 1}
          className="gap-1"
          title="First page"
        >
          <ChevronsLeft className="h-3 w-3" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.setPage(page - 1)}
          disabled={!hasPrev}
          className="gap-1"
          title="Previous page"
        >
          <ChevronLeft className="h-3 w-3" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === 'ellipsis') {
              return (
                <Button
                  key={`ellipsis-${index}`}
                  variant="ghost"
                  size="sm"
                  disabled
                  className="w-8 h-8 p-0"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              );
            }
            
            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "outline"}
                size="sm"
                onClick={() => actions.setPage(pageNum)}
                className="w-8 h-8 p-0"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.setPage(page + 1)}
          disabled={!hasNext}
          className="gap-1"
          title="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3 w-3" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.setPage(totalPages)}
          disabled={page === totalPages}
          className="gap-1"
          title="Last page"
        >
          <ChevronsRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Items per page selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground hidden sm:inline">Items per page:</span>
        <Select 
          value={String(limit)} 
          onValueChange={(value) => {
            actions.setLimit && actions.setLimit(parseInt(value));
          }}
        >
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}