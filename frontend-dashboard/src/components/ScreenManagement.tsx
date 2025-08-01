"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Search, 
  Plus, 
  Grid, 
  List, 
  Filter,
  MoreVertical,
  Wifi,
  WifiOff,
  AlertTriangle,
  Wrench,
  RefreshCw,
  Monitor,
  MapPin,
  Clock,
  Settings,
  Trash2,
  Edit
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AddScreenModal } from "./AddScreenModal";
import { ScreenDetailModal } from "./ScreenDetailModal";

export function ScreenManagement() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);

  const screens = [
    {
      id: "SCR-001",
      name: "Main Lobby Display",
      location: "Building A - Lobby",
      status: "online",
      currentContent: "Welcome Playlist",
      lastSeen: "2 min ago",
      uptime: "99.8%",
      ipAddress: "192.168.1.101",
      model: "Samsung QB65R",
      resolution: "3840x2160"
    },
    {
      id: "SCR-002", 
      name: "Cafeteria Menu Board",
      location: "Building A - Cafeteria",
      status: "online",
      currentContent: "Daily Menu",
      lastSeen: "1 min ago",
      uptime: "98.2%",
      ipAddress: "192.168.1.102",
      model: "LG 55UM5N",
      resolution: "1920x1080"
    },
    {
      id: "SCR-003",
      name: "Conference Room A",
      location: "Building B - Room 201",
      status: "offline",
      currentContent: "Schedule Display",
      lastSeen: "15 min ago",
      uptime: "95.1%",
      ipAddress: "192.168.1.103",
      model: "Sony FWD-65X80L",
      resolution: "3840x2160"
    },
    {
      id: "SCR-004",
      name: "Reception Display",
      location: "Building A - Reception",
      status: "reconnecting",
      currentContent: "Company News",
      lastSeen: "30 sec ago",
      uptime: "99.9%",
      ipAddress: "192.168.1.104",
      model: "Samsung QB43R",
      resolution: "1920x1080"
    },
    {
      id: "SCR-005",
      name: "Elevator Display 1",
      location: "Building A - Elevator",
      status: "maintenance",
      currentContent: "Building Info",
      lastSeen: "8 min ago",
      uptime: "97.5%",
      ipAddress: "192.168.1.105",
      model: "LG 32SM5KE",
      resolution: "1920x1080"
    },
    {
      id: "SCR-006",
      name: "Parking Display",
      location: "Parking Garage",
      status: "error",
      currentContent: "Parking Status",
      lastSeen: "45 sec ago",
      uptime: "99.1%",
      ipAddress: "192.168.1.106",
      model: "Samsung QB55R",
      resolution: "1920x1080"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-600 bg-green-50 border-green-200";
      case "offline":
        return "text-red-600 bg-red-50 border-red-200";
      case "reconnecting":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "maintenance":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <Wifi className="h-3 w-3" />;
      case "offline":
        return <WifiOff className="h-3 w-3" />;
      case "reconnecting":
        return <RefreshCw className="h-3 w-3 animate-spin" />;
      case "error":
        return <AlertTriangle className="h-3 w-3" />;
      case "maintenance":
        return <Wrench className="h-3 w-3" />;
      default:
        return <Monitor className="h-3 w-3" />;
    }
  };

  const filteredScreens = screens.filter(screen =>
    screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    screen.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    screen.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedScreens(filteredScreens.map(screen => screen.id));
    } else {
      setSelectedScreens([]);
    }
  };

  const handleSelectScreen = (screenId: string, checked: boolean) => {
    if (checked) {
      setSelectedScreens([...selectedScreens, screenId]);
    } else {
      setSelectedScreens(selectedScreens.filter(id => id !== screenId));
    }
  };

  const bulkActions = [
    { label: "Assign Playlist", action: () => console.log("Assign playlist") },
    { label: "Restart Screens", action: () => console.log("Restart screens") },
    { label: "Update Settings", action: () => console.log("Update settings") },
    { label: "Set Maintenance Mode", action: () => console.log("Maintenance mode") }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Screen Management</h1>
          <p className="text-muted-foreground">Manage and monitor all display screens in your network</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Screen
        </Button>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search screens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {selectedScreens.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedScreens.length} selected
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Bulk Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {bulkActions.map((action, index) => (
                        <DropdownMenuItem key={index} onClick={action.action}>
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              
              <div className="border rounded-md">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none border-l"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screen List/Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              <span>All Screens</span>
              <Badge variant="outline">{filteredScreens.length}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4 w-12">
                      <Checkbox
                        checked={selectedScreens.length === filteredScreens.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-4">Screen Name</th>
                    <th className="text-left p-4">ID</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Location</th>
                    <th className="text-left p-4">Current Content</th>
                    <th className="text-left p-4">Last Seen</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScreens.map((screen) => (
                    <tr key={screen.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedScreens.includes(screen.id)}
                          onCheckedChange={(checked) => handleSelectScreen(screen.id, checked as boolean)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{screen.name}</div>
                      </td>
                      <td className="p-4">
                        <code className="text-sm bg-muted px-1 py-0.5 rounded">{screen.id}</code>
                      </td>
                      <td className="p-4">
                        <Badge className={`${getStatusColor(screen.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(screen.status)}
                          {screen.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {screen.location}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{screen.currentContent}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {screen.lastSeen}
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
                            <DropdownMenuItem onClick={() => setSelectedScreen(screen.id)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restart
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filteredScreens.map((screen) => (
                <Card key={screen.id} className="relative">
                  <div className="absolute top-3 left-3">
                    <Checkbox
                      checked={selectedScreens.includes(screen.id)}
                      onCheckedChange={(checked) => handleSelectScreen(screen.id, checked as boolean)}
                    />
                  </div>
                  <div className="absolute top-3 right-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedScreen(screen.id)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Restart
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <CardContent className="p-6 pt-12">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold">{screen.name}</h4>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{screen.id}</code>
                      </div>

                      <Badge className={`${getStatusColor(screen.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(screen.status)}
                        {screen.status}
                      </Badge>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{screen.location}</span>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Current: </span>
                          <span className="font-medium">{screen.currentContent}</span>
                        </div>

                        <div className="flex justify-between text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{screen.lastSeen}</span>
                          </div>
                          <span>Uptime: {screen.uptime}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddScreenModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
      
      <ScreenDetailModal 
        screenId={selectedScreen} 
        isOpen={!!selectedScreen}
        onClose={() => setSelectedScreen(null)}
        screen={screens.find(s => s.id === selectedScreen)}
      />
    </div>
  );
}