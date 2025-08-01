"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  RefreshCw,
  AlertOctagon,
  Power,
  Activity,
  Clock,
  MapPin,
  Search,
  Filter
} from "lucide-react";
import { toast } from "sonner";

interface Screen {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'error' | 'reconnecting';
  currentContent: string;
  playbackProgress: number;
  lastSeen: string;
  connectionStrength: number;
  uptime: string;
  temperature?: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  screenId?: string;
}

export function RealTimeControl() {
  const [screens, setScreens] = useState<Screen[]>([
    {
      id: "SCR-001",
      name: "Main Lobby Display",
      location: "Building A - Lobby",
      status: "online",
      currentContent: "Welcome Playlist (2/5)",
      playbackProgress: 65,
      lastSeen: "Just now",
      connectionStrength: 95,
      uptime: "99.8%"
    },
    {
      id: "SCR-002",
      name: "Cafeteria Menu Board",
      location: "Building A - Cafeteria",
      status: "online",
      currentContent: "Daily Menu (1/3)",
      playbackProgress: 30,
      lastSeen: "Just now",
      connectionStrength: 88,
      uptime: "98.2%"
    },
    {
      id: "SCR-003",
      name: "Conference Room A",
      location: "Building B - Room 201",
      status: "offline",
      currentContent: "Schedule Display",
      playbackProgress: 0,
      lastSeen: "15 min ago",
      connectionStrength: 0,
      uptime: "95.1%"
    },
    {
      id: "SCR-004",
      name: "Reception Display",
      location: "Building A - Reception",
      status: "reconnecting",
      currentContent: "Company News (3/8)",
      playbackProgress: 45,
      lastSeen: "30 sec ago",
      connectionStrength: 42,
      uptime: "99.9%"
    },
    {
      id: "SCR-005",
      name: "Elevator Display 1",
      location: "Building A - Elevator",
      status: "error",
      currentContent: "Building Info",
      playbackProgress: 0,
      lastSeen: "8 min ago",
      connectionStrength: 15,
      uptime: "97.5%"
    },
    {
      id: "SCR-006",
      name: "Parking Display",
      location: "Parking Garage",
      status: "online",
      currentContent: "Parking Status (1/1)",
      playbackProgress: 100,
      lastSeen: "Just now",
      connectionStrength: 78,
      uptime: "99.1%"
    }
  ]);

  const [activityLog, setActivityLog] = useState<ActivityLog[]>([
    {
      id: "1",
      timestamp: "2024-08-01T14:35:00Z",
      type: "success",
      message: "Playlist updated successfully on SCR-001",
      screenId: "SCR-001"
    },
    {
      id: "2",
      timestamp: "2024-08-01T14:32:00Z",
      type: "warning",
      message: "Connection quality degraded on SCR-004",
      screenId: "SCR-004"
    },
    {
      id: "3",
      timestamp: "2024-08-01T14:20:00Z",
      type: "error",
      message: "Screen SCR-003 went offline",
      screenId: "SCR-003"
    },
    {
      id: "4",
      timestamp: "2024-08-01T14:15:00Z",
      type: "info",
      message: "Emergency broadcast test completed successfully"
    },
    {
      id: "5",
      timestamp: "2024-08-01T14:10:00Z",
      type: "success",
      message: "Network health check completed - all systems normal"
    }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [emergencyMode, setEmergencyMode] = useState(false);

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setScreens(prev => prev.map(screen => ({
        ...screen,
        playbackProgress: screen.status === 'online' 
          ? (screen.playbackProgress + Math.random() * 5) % 100 
          : screen.playbackProgress
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const filteredScreens = screens.filter(screen => {
    const matchesSearch = screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         screen.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         screen.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || screen.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onlineCount = screens.filter(s => s.status === 'online').length;
  const offlineCount = screens.filter(s => s.status === 'offline').length;
  const errorCount = screens.filter(s => s.status === 'error').length;
  const averageConnection = Math.round(
    screens.filter(s => s.status === 'online')
           .reduce((acc, s) => acc + s.connectionStrength, 0) / onlineCount || 0
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'reconnecting':
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
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
      case 'reconnecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConnectionColor = (strength: number) => {
    if (strength >= 80) return 'text-green-600';
    if (strength >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleEmergencyStop = () => {
    if (!emergencyMode) {
      toast.error("Emergency stop activated - all displays paused");
      setEmergencyMode(true);
    } else {
      toast.success("Emergency mode deactivated - displays resumed");
      setEmergencyMode(false);
    }
  };

  const handleEmergencyBroadcast = () => {
    toast.success("Emergency message broadcasted to all displays");
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: "warning",
      message: "Emergency broadcast activated across all displays"
    };
    setActivityLog(prev => [newLog, ...prev]);
  };

  const handleScreenAction = (screenId: string, action: string) => {
    toast.success(`${action} command sent to ${screenId}`);
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: "info",
      message: `${action} action performed on ${screenId}`,
      screenId
    };
    setActivityLog(prev => [newLog, ...prev]);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Real-Time Control Dashboard</h1>
          <p className="text-muted-foreground">Monitor and control all displays in real-time</p>
        </div>
        
        {/* Emergency Controls */}
        <div className="flex gap-2">
          <Button
            variant={emergencyMode ? "default" : "destructive"}
            onClick={handleEmergencyStop}
            className="flex items-center gap-2"
          >
            <AlertOctagon className="h-4 w-4" />
            {emergencyMode ? "Resume All" : "Emergency Stop"}
          </Button>
          <Button variant="outline" onClick={handleEmergencyBroadcast}>
            Emergency Broadcast
          </Button>
        </div>
      </div>

      {/* Network Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-lg font-semibold">{onlineCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-lg font-semibold">{offlineCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-lg font-semibold">{errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Connection</p>
                <p className="text-lg font-semibold">{averageConnection}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Alert */}
      {emergencyMode && (
        <Alert className="border-red-200 bg-red-50">
          <AlertOctagon className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Emergency mode is active. All displays are paused and showing emergency content.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Status Grid */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Live Display Status</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search displays..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredScreens.map(screen => (
                <Card key={screen.id} className={`${emergencyMode ? 'bg-red-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(screen.status)}
                            <h4 className="font-medium">{screen.name}</h4>
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{screen.id}</code>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {screen.location}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <Badge className={getStatusColor(screen.status)}>
                            {screen.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {screen.lastSeen}
                          </p>
                        </div>
                      </div>

                      {/* Content & Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{screen.currentContent}</p>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(screen.playbackProgress)}%
                          </span>
                        </div>
                        <Progress value={screen.playbackProgress} className="h-2" />
                      </div>

                      {/* Stats & Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            <span className={getConnectionColor(screen.connectionStrength)}>
                              {screen.connectionStrength}%
                            </span>
                          </div>
                          <div>Uptime: {screen.uptime}</div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleScreenAction(screen.id, 'Pause')}
                            disabled={screen.status !== 'online'}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleScreenAction(screen.id, 'Play')}
                            disabled={screen.status !== 'online'}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleScreenAction(screen.id, 'Skip')}
                            disabled={screen.status !== 'online'}
                          >
                            <SkipForward className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleScreenAction(screen.id, 'Restart')}
                            disabled={screen.status !== 'online'}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <div>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {activityLog.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{log.message}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(log.timestamp)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}