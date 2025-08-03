import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { 
  Search, 
  Filter, 
  X,
  SortAsc,
  SortDesc,
  Grid,
  List,
  RefreshCw,
  Calendar,
  Tag,
  FileImage,
  FileVideo,
  Clock
} from "lucide-react";
import { useSearchState, useMediaPagination, useMediaActions, useMediaItems } from "../stores/useMediaStore";
import type { MediaFilters as MediaFiltersType } from "../types";

/**
 * MediaFilters Component
 * 
 * Provides comprehensive filtering, searching, and sorting capabilities for the media library.
 * Integrates with Zustand store for state management and real-time updates.
 */

interface MediaFiltersProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  resultCount: number;
}

export function MediaFilters({ viewMode, onViewModeChange, resultCount }: MediaFiltersProps) {
  const { searchValue, filters, setSearch, setFilters, clearFilters } = useSearchState();
  const pagination = useMediaPagination();
  const { fetchMedia, invalidateCache } = useMediaActions();
  const mediaItems = useMediaItems();
  
  // Local state for immediate UI updates
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Extract available tags from all media items
  const availableTags = Array.from(
    new Set(
      mediaItems
        .flatMap(item => item.tags || [])
        .filter(tag => tag && tag.trim())
    )
  ).sort();

  // Handle search input with immediate UI feedback
  const handleSearchChange = (value: string) => {
    setLocalSearchValue(value);
    setSearch(value);
  };

  // Handle filter changes
  const handleTypeFilter = (type: string) => {
    const typeValue = type === "all" ? "" : type as "image" | "video";
    setFilters({ type: typeValue });
  };

  const handleSortChange = (sortBy: MediaFiltersType['sortBy']) => {
    setFilters({ sortBy });
  };

  const handleSortOrderToggle = () => {
    const newOrder = filters.sortOrder === 'desc' ? 'asc' : 'desc';
    setFilters({ sortOrder: newOrder });
  };

  const handleTagsFilter = (tags: string) => {
    setFilters({ tags: tags || undefined });
  };

  // Handle refresh with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    invalidateCache();
    await fetchMedia();
    setIsRefreshing(false);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setLocalSearchValue("");
    clearFilters();
  };

  // Sync local search with store search
  useEffect(() => {
    setLocalSearchValue(searchValue);
  }, [searchValue]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search media"]') as HTMLInputElement;
        searchInput?.focus();
        return;
      }

      // Quick filter shortcuts
      if (e.altKey) {
        e.preventDefault();
        switch (e.key) {
          case '1':
            handleTypeFilter("all");
            break;
          case '2':
            handleTypeFilter("image");
            break;
          case '3':
            handleTypeFilter("video");
            break;
          case 'c':
            handleClearFilters();
            break;
          case 'r':
            handleRefresh();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleTypeFilter, handleClearFilters, handleRefresh]);

  // Check if any filters are active
  const hasActiveFilters = 
    filters.search || 
    filters.type || 
    filters.tags || 
    filters.sortBy !== 'date' || 
    filters.sortOrder !== 'desc';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media files by name, tags... (Ctrl+K)"
              value={localSearchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-20"
            />
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground hidden sm:block">
              ⌘K
            </div>
            {localSearchValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
            <Button
              variant={!filters.type ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeFilter("all")}
              className="gap-1"
              title="Show all files (Alt+1)"
            >
              <Filter className="h-3 w-3" />
              All Files
              <span className="hidden lg:inline text-xs text-muted-foreground ml-1">Alt+1</span>
            </Button>
            <Button
              variant={filters.type === "image" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeFilter("image")}
              className="gap-1"
              title="Show images only (Alt+2)"
            >
              <FileImage className="h-3 w-3" />
              Images Only
              <span className="hidden lg:inline text-xs text-muted-foreground ml-1">Alt+2</span>
            </Button>
            <Button
              variant={filters.type === "video" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeFilter("video")}
              className="gap-1"
              title="Show videos only (Alt+3)"
            >
              <FileVideo className="h-3 w-3" />
              Videos Only
              <span className="hidden lg:inline text-xs text-muted-foreground ml-1">Alt+3</span>
            </Button>
            <Button
              variant={filters.sortBy === "usage" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("usage")}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              Most Used
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select 
                  value={filters.type || "all"} 
                  onValueChange={handleTypeFilter}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                  <SelectItem value="usage">Usage</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSortOrderToggle}
                className="gap-1"
              >
                {filters.sortOrder === 'desc' ? (
                  <SortDesc className="h-4 w-4" />
                ) : (
                  <SortAsc className="h-4 w-4" />
                )}
                {filters.sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </Button>

              {/* Tags Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 min-w-32 justify-start"
                  >
                    <Tag className="h-3 w-3" />
                    {filters.tags ? (
                      <span className="truncate">{filters.tags}</span>
                    ) : (
                      "Filter by tags"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Filter by Tags</h4>
                    
                    {/* Manual tag input */}
                    <Input
                      placeholder="Type tag name..."
                      value={filters.tags || ""}
                      onChange={(e) => handleTagsFilter(e.target.value)}
                      className="text-sm"
                    />
                    
                    {/* Available tags */}
                    {availableTags.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Available tags ({availableTags.length}):
                        </p>
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                          {availableTags.map((tag) => (
                            <Button
                              key={tag}
                              variant={filters.tags === tag ? "default" : "outline"}
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => handleTagsFilter(filters.tags === tag ? "" : tag)}
                            >
                              {tag}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {availableTags.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No tags found in current media
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-1"
                  title="Clear all filters (Alt+C)"
                >
                  <X className="h-3 w-3" />
                  Clear
                  <span className="hidden lg:inline text-xs text-muted-foreground ml-1">Alt+C</span>
                </Button>
              )}

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-1"
                title="Refresh media library (Alt+R)"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
                <span className="hidden lg:inline text-xs text-muted-foreground ml-1">Alt+R</span>
              </Button>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-3">
              {/* Results Count */}
              <Badge variant="outline" className="text-xs">
                {resultCount} {resultCount === 1 ? 'file' : 'files'}
                {pagination.total > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    of {pagination.total}
                  </span>
                )}
              </Badge>

              {/* View Mode Toggle */}
              <div className="border rounded-md flex">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("grid")}
                  className="rounded-r-none px-3"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("list")}
                  className="rounded-l-none border-l px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              
              {filters.search && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Search: "{filters.search}"
                  <button onClick={() => setFilters({ search: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filters.type && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Type: {filters.type}
                  <button onClick={() => setFilters({ type: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filters.tags && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Tags: {filters.tags}
                  <button onClick={() => setFilters({ tags: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {(filters.sortBy !== 'date' || filters.sortOrder !== 'desc') && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Sort: {filters.sortBy} ({filters.sortOrder})
                  <button onClick={() => setFilters({ sortBy: 'date', sortOrder: 'desc' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}