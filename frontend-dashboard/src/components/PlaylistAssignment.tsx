"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Search, Monitor, MapPin, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Screen {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  currentPlaylist?: string;
}

interface Playlist {
  id: string;
  name: string;
  assignedScreens: string[];
}

interface PlaylistAssignmentProps {
  playlist: Playlist | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistAssignment({ playlist, isOpen, onClose }: PlaylistAssignmentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);

  const screens: Screen[] = [
    {
      id: "SCR-001",
      name: "Main Lobby Display",
      location: "Building A - Lobby",
      status: "online",
      currentPlaylist: "Main Lobby Welcome"
    },
    {
      id: "SCR-002",
      name: "Cafeteria Menu Board",
      location: "Building A - Cafeteria", 
      status: "online",
      currentPlaylist: "Cafeteria Menu"
    },
    {
      id: "SCR-003",
      name: "Conference Room A",
      location: "Building B - Room 201",
      status: "offline"
    },
    {
      id: "SCR-004",
      name: "Reception Display",
      location: "Building A - Reception",
      status: "online",
      currentPlaylist: "Main Lobby Welcome"
    },
    {
      id: "SCR-005",
      name: "Elevator Display 1",
      location: "Building A - Elevator",
      status: "online"
    },
    {
      id: "SCR-006",
      name: "Parking Display",
      location: "Parking Garage",
      status: "error"
    }
  ];

  const filteredScreens = screens.filter(screen =>
    screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    screen.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    screen.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'offline':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleScreenSelect = (screenId: string, checked: boolean) => {
    if (checked) {
      setSelectedScreens([...selectedScreens, screenId]);
    } else {
      setSelectedScreens(selectedScreens.filter(id => id !== screenId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedScreens(filteredScreens.filter(s => s.status === 'online').map(s => s.id));
    } else {
      setSelectedScreens([]);
    }
  };

  const handleAssign = () => {
    if (selectedScreens.length === 0) {
      toast.error("Please select at least one screen");
      return;
    }

    toast.success(`Playlist assigned to ${selectedScreens.length} screen(s)`);
    setSelectedScreens([]);
    onClose();
  };

  const handleUnassign = () => {
    if (!playlist) return;
    
    const currentlyAssigned = screens.filter(s => 
      playlist.assignedScreens.includes(s.id)
    );

    if (currentlyAssigned.length === 0) {
      toast.error("No screens are currently assigned to this playlist");
      return;
    }

    toast.success(`Playlist unassigned from ${currentlyAssigned.length} screen(s)`);
  };

  if (!playlist) return null;

  const onlineScreens = filteredScreens.filter(s => s.status === 'online');
  const currentlyAssigned = screens.filter(s => playlist.assignedScreens.includes(s.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assign Playlist: {playlist.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Current Assignments */}
          {currentlyAssigned.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Currently Assigned Screens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentlyAssigned.map(screen => (
                    <div key={screen.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getStatusIcon(screen.status)}
                      <div className="flex-1">
                        <p className="font-medium">{screen.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {screen.location}
                        </p>
                      </div>
                      <Badge className={getStatusColor(screen.status)}>
                        {screen.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="outline" onClick={handleUnassign}>
                    Unassign from All Screens
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Screen Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign to Screens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search screens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedScreens.length === onlineScreens.length && onlineScreens.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select all online screens ({onlineScreens.length})
                  </label>
                </div>
                {selectedScreens.length > 0 && (
                  <Badge variant="secondary">
                    {selectedScreens.length} selected
                  </Badge>
                )}
              </div>

              {/* Screen List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredScreens.map(screen => (
                  <div
                    key={screen.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg ${
                      screen.status !== 'online' ? 'opacity-50' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selectedScreens.includes(screen.id)}
                      onCheckedChange={(checked) => handleScreenSelect(screen.id, checked as boolean)}
                      disabled={screen.status !== 'online'}
                    />
                    
                    {getStatusIcon(screen.status)}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{screen.name}</p>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{screen.id}</code>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {screen.location}
                      </p>
                      {screen.currentPlaylist && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Current: {screen.currentPlaylist}
                        </p>
                      )}
                    </div>
                    
                    <Badge className={getStatusColor(screen.status)}>
                      {screen.status}
                    </Badge>
                  </div>
                ))}
              </div>

              {filteredScreens.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-8 w-8 mx-auto mb-2" />
                  <p>No screens found matching your search</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Assignment Notes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Only online screens can be assigned new playlists</li>
                <li>• Assigning a playlist will replace the current content on selected screens</li>
                <li>• Changes take effect immediately on connected displays</li>
                <li>• Offline screens will receive the assignment when they come online</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={selectedScreens.length === 0}
          >
            Assign to {selectedScreens.length} Screen{selectedScreens.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}