/**
 * Drag and Drop Hooks and Utilities
 * 
 * Provides comprehensive drag-and-drop functionality for playlist management
 * using @dnd-kit with optimized performance and accessibility features.
 * 
 * Features:
 * - Drag media items from library to playlists
 * - Reorder playlist items within playlists
 * - Visual feedback during drag operations
 * - Keyboard navigation support
 * - Auto-scroll during drag operations
 * - Optimistic updates for better UX
 */

import { useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToHorizontalAxis,
  restrictToWindowEdges,
  restrictToParentElement,
} from '@dnd-kit/modifiers';

import { usePlaylistStore } from '../stores/usePlaylistStore';
import { useMediaStore } from '../stores/useMediaStore';
import type { MediaItem, PlaylistItem, DragState } from '../types';

// ============================
// Types
// ============================

export interface DragItem {
  id: string;
  type: 'media' | 'playlist-item';
  data: MediaItem | PlaylistItem;
}

export interface DropZone {
  id: string;
  type: 'playlist' | 'playlist-items' | 'media-library';
  accepts: Array<'media' | 'playlist-item'>;
}

export interface DragAndDropConfig {
  enableSorting?: boolean;
  enableDropFromLibrary?: boolean;
  sortingStrategy?: 'vertical' | 'horizontal' | 'grid';
  autoScroll?: boolean;
  restrictAxis?: 'vertical' | 'horizontal' | 'none';
  restrictToParent?: boolean;
}

// ============================
// Custom Collision Detection
// ============================

/**
 * Custom collision detection algorithm that prioritizes droppable areas
 * and provides better handling for overlapping drop zones
 */
function customCollisionDetection(args: any) {
  // First, let's see if there are any collisions with droppable areas
  const pointerCollisions = pointerWithin(args);
  const intersectionCollisions = rectIntersection(args);
  
  // If there are pointer collisions, prefer those
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  
  // Otherwise, use intersection-based detection
  if (intersectionCollisions.length > 0) {
    return intersectionCollisions;
  }
  
  // Fallback to closest center
  return closestCenter(args);
}

// ============================
// Main Drag and Drop Hook
// ============================

export function useDragAndDrop(config: DragAndDropConfig = {}) {
  const {
    enableSorting = true,
    enableDropFromLibrary = true,
    sortingStrategy = 'vertical',
    autoScroll = true,
    restrictAxis = 'none',
    restrictToParent = false,
  } = config;

  // Store hooks
  const dragState = usePlaylistStore((state) => state.dragState);
  const setDragState = usePlaylistStore((state) => state.setDragState);
  const clearDragState = usePlaylistStore((state) => state.clearDragState);
  const addMediaToPlaylist = usePlaylistStore((state) => state.addMediaToPlaylist);
  const reorderPlaylistItems = usePlaylistStore((state) => state.reorderPlaylistItems);
  const currentPlaylist = usePlaylistStore((state) => state.currentPlaylist);

  // Sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Delay for touch devices
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Modifiers based on configuration
  const modifiers = useMemo(() => {
    const mods = [];
    
    if (restrictAxis === 'vertical') {
      mods.push(restrictToVerticalAxis);
    } else if (restrictAxis === 'horizontal') {
      mods.push(restrictToHorizontalAxis);
    }
    
    if (restrictToParent) {
      mods.push(restrictToParentElement);
    } else {
      mods.push(restrictToWindowEdges);
    }
    
    return mods;
  }, [restrictAxis, restrictToParent]);

  // Sorting strategy based on configuration
  const getSortingStrategy = useCallback(() => {
    switch (sortingStrategy) {
      case 'horizontal':
        return horizontalListSortingStrategy;
      case 'grid':
        return rectSortingStrategy;
      default:
        return verticalListSortingStrategy;
    }
  }, [sortingStrategy]);

  // Drag event handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeId = String(active.id);
    
    // Determine drag item type and data
    let draggedItemType: 'media' | 'playlist-item' = 'media';
    
    // Check if it's a playlist item (assuming playlist items have a specific ID format)
    if (activeId.includes('playlist-item-')) {
      draggedItemType = 'playlist-item';
    }
    
    setDragState({
      isDragging: true,
      draggedItemId: activeId,
      draggedItemType,
    });
  }, [setDragState]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over) {
      setDragState({
        dropZoneId: String(over.id),
        dragOverItemId: String(over.id),
      });
    }
  }, [setDragState]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      clearDragState();
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const draggedItemType = dragState.draggedItemType;

    try {
      // Handle different drop scenarios
      if (draggedItemType === 'media' && enableDropFromLibrary) {
        // Dropping media from library to playlist
        if (overId.startsWith('playlist-') || overId === 'current-playlist') {
          const playlistId = overId === 'current-playlist' 
            ? currentPlaylist?.id 
            : overId.replace('playlist-', '');
            
          if (playlistId) {
            await addMediaToPlaylist(playlistId, activeId);
          }
        }
      } else if (draggedItemType === 'playlist-item' && enableSorting) {
        // Reordering playlist items
        if (activeId !== overId && currentPlaylist) {
          const items = [...currentPlaylist.items];
          const activeIndex = items.findIndex(item => item.id === activeId);
          const overIndex = items.findIndex(item => item.id === overId);
          
          if (activeIndex !== -1 && overIndex !== -1) {
            // Reorder the array
            const [movedItem] = items.splice(activeIndex, 1);
            items.splice(overIndex, 0, movedItem);
            
            // Update order numbers
            const reorderedItems = items.map((item, index) => ({
              ...item,
              order: index,
            }));
            
            await reorderPlaylistItems(currentPlaylist.id, reorderedItems);
          }
        }
      }
    } catch (error) {
      console.error('Drag operation failed:', error);
    } finally {
      clearDragState();
    }
  }, [
    dragState.draggedItemType,
    enableDropFromLibrary,
    enableSorting,
    currentPlaylist,
    addMediaToPlaylist,
    reorderPlaylistItems,
    clearDragState,
  ]);

  const handleDragCancel = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  // DndContext props
  const dndContextProps = useMemo(() => ({
    sensors,
    collisionDetection: customCollisionDetection,
    modifiers,
    autoScroll,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
  }), [
    sensors,
    modifiers,
    autoScroll,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  ]);

  return {
    // Context props
    dndContextProps,
    
    // State
    dragState,
    isDragging: dragState.isDragging,
    
    // Utilities
    getSortingStrategy,
    
    // Components (re-exported for convenience)
    DndContext,
    SortableContext,
    DragOverlay,
  };
}

// ============================
// Specialized Hooks
// ============================

/**
 * Hook for media library drag and drop functionality
 */
export function useMediaLibraryDrag() {
  const selectedMedia = useMediaStore((state) => state.selectedMedia);
  
  return useDragAndDrop({
    enableSorting: false,
    enableDropFromLibrary: true,
    sortingStrategy: 'grid',
    restrictAxis: 'none',
    autoScroll: true,
  });
}

/**
 * Hook for playlist editor drag and drop functionality
 */
export function usePlaylistEditorDrag() {
  return useDragAndDrop({
    enableSorting: true,
    enableDropFromLibrary: true,
    sortingStrategy: 'vertical',
    restrictAxis: 'vertical',
    restrictToParent: true,
    autoScroll: true,
  });
}

/**
 * Hook for creating droppable playlist zones
 */
export function useDroppablePlaylist(playlistId: string) {
  const dragState = usePlaylistStore((state) => state.dragState);
  
  const isOver = dragState.dropZoneId === `playlist-${playlistId}`;
  const canDrop = dragState.draggedItemType === 'media';
  
  return {
    isOver,
    canDrop,
    isActive: isOver && canDrop,
    dropProps: {
      id: `playlist-${playlistId}`,
      'data-droppable': true,
      'data-accepts': 'media',
    },
  };
}

// ============================
// Drag Overlay Components
// ============================

/**
 * Hook to get the appropriate drag overlay component
 */
export function useDragOverlay() {
  const dragState = usePlaylistStore((state) => state.dragState);
  const media = useMediaStore((state) => state.media);
  const currentPlaylist = usePlaylistStore((state) => state.currentPlaylist);
  
  const getDraggedItem = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedItemId) {
      return null;
    }
    
    if (dragState.draggedItemType === 'media') {
      return media.find(item => item._id === dragState.draggedItemId);
    } else if (dragState.draggedItemType === 'playlist-item') {
      return currentPlaylist?.items.find(item => item.id === dragState.draggedItemId);
    }
    
    return null;
  }, [dragState, media, currentPlaylist]);
  
  return {
    draggedItem: getDraggedItem(),
    isDragging: dragState.isDragging,
    draggedItemType: dragState.draggedItemType,
  };
}

// ============================
// Utility Functions
// ============================

/**
 * Get CSS classes for drag states
 */
export function getDragStateClasses(
  isDragging: boolean,
  isOver?: boolean,
  canDrop?: boolean
): string {
  const classes = [];
  
  if (isDragging) {
    classes.push('opacity-50', 'cursor-grabbing');
  }
  
  if (isOver && canDrop) {
    classes.push('ring-2', 'ring-blue-500', 'ring-opacity-50', 'bg-blue-50');
  } else if (isOver && !canDrop) {
    classes.push('ring-2', 'ring-red-500', 'ring-opacity-50', 'bg-red-50');
  }
  
  if (canDrop && !isOver) {
    classes.push('ring-1', 'ring-gray-300', 'ring-dashed');
  }
  
  return classes.join(' ');
}

/**
 * Generate unique drag IDs
 */
export function generateDragId(type: 'media' | 'playlist-item', id: string): string {
  return `${type}-${id}`;
}

/**
 * Parse drag ID to get type and original ID
 */
export function parseDragId(dragId: string): { type: string; id: string } | null {
  const parts = dragId.split('-');
  if (parts.length < 2) return null;
  
  const type = parts[0];
  const id = parts.slice(1).join('-');
  
  return { type, id };
}

/**
 * Check if an item can be dropped in a specific zone
 */
export function canDropInZone(
  draggedItemType: 'media' | 'playlist-item',
  dropZoneType: string,
  dropZoneAccepts: string[]
): boolean {
  return dropZoneAccepts.includes(draggedItemType);
}

// ============================
// Accessibility Helpers
// ============================

/**
 * Get accessibility props for draggable items
 */
export function getDraggableA11yProps(
  itemId: string,
  itemType: 'media' | 'playlist-item',
  itemName: string
) {
  return {
    'aria-label': `Draggable ${itemType} ${itemName}`,
    'aria-describedby': `drag-instructions-${itemType}`,
    role: 'button',
    tabIndex: 0,
  };
}

/**
 * Get accessibility props for droppable zones
 */
export function getDroppableA11yProps(
  zoneId: string,
  zoneType: string,
  accepts: string[]
) {
  return {
    'aria-label': `Drop zone for ${accepts.join(' and ')}`,
    'aria-describedby': `drop-instructions-${zoneType}`,
    role: 'region',
  };
}

/**
 * Generate screen reader instructions for drag and drop
 */
export function getDragInstructions(itemType: 'media' | 'playlist-item'): string {
  const baseInstructions = 'Press space or enter to pick up this item. Use arrow keys to move it around.';
  
  if (itemType === 'media') {
    return `${baseInstructions} Drop it on a playlist to add it to that playlist.`;
  } else {
    return `${baseInstructions} Drop it on another position to reorder the playlist.`;
  }
}