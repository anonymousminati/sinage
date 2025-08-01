"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { 
  Monitor, 
  Settings, 
  BarChart3, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Power, 
  Volume2,
  Sun,
  Calendar,
  Activity,
  MapPin,
  Clock,
  HardDrive,
  Cpu,
  Thermometer
} from "lucide-react";
import { toast } from "sonner";

interface Screen {
  id: string;
  name: string;
  location: string;
  status: string;
  currentContent: string;
  lastSeen: string;
  uptime: string;
  ipAddress: string;
  model: string;
  resolution: string;
}

interface ScreenDetailModalProps {
  screenId: string | null;
  isOpen: boolean;
  onClose: () => void;
  screen?: Screen;
}

export function ScreenDetailModal({ screenId, isOpen, onClose, screen }: ScreenDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [screenSettings, setScreenSettings] = useState({
    name: screen?.name || "",
    location: screen?.location || "",
    brightness: [75],
    volume: [50],
    powerSchedule: true,
    autoRestart: true,
    updateChannel: "stable"
  });

  if (!screen) return null;

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
        return <Wifi className="h-4 w-4" />;
      case "offline":
        return <WifiOff className="h-4 w-4" />;
      case "reconnecting":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully");
  };

  const handleRestartScreen = () => {
    toast.success("Restart command sent to screen");
  };

  const connectionHistory = [
    { timestamp: "2024-08-01 14:30", status: "Connected", duration: "45m" },
    { timestamp: "2024-08-01 13:45", status: "Disconnected", duration: "2m" },
    { timestamp: "2024-08-01 09:00", status: "Connected", duration: "4h 45m" },
    { timestamp: "2024-08-01 08:58", status: "Disconnected", duration: "30s" },
    { timestamp: "2024-07-31 16:00", status: "Connected", duration: "16h 58m" }
  ];

  const performanceMetrics = [
    { label: "CPU Usage", value: "23%", status: "good" },
    { label: "Memory Usage", value: "45%", status: "good" },
    { label: "Storage Used", value: "67%", status: "warning" },
    { label: "Temperature", value: "42°C", status: "good" },
    { label: "Network Latency", value: "12ms", status: "good" },
    { label: "Uptime", value: "99.8%", status: "excellent" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {screen.name}
          </DialogTitle>
          <DialogDescription>
            Manage settings and monitor performance for {screen.id}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[60vh] mt-4">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Current Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className={`${getStatusColor(screen.status)} flex items-center gap-1`}>
                        {getStatusIcon(screen.status)}
                        {screen.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Content</span>
                      <span className="text-sm font-medium">{screen.currentContent}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Seen</span>
                      <span className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {screen.lastSeen}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Uptime</span>
                      <span className="text-sm font-medium">{screen.uptime}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Device Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Screen ID</span>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">{screen.id}</code>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Model</span>
                      <span className="text-sm font-medium">{screen.model}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Resolution</span>
                      <span className="text-sm font-medium">{screen.resolution}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">IP Address</span>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">{screen.ipAddress}</code>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Location</span>
                      <span className="text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {screen.location}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={handleRestartScreen}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restart Screen
                    </Button>
                    <Button size="sm" variant="outline">
                      <Power className="h-4 w-4 mr-2" />
                      Power Cycle
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Remote Control
                    </Button>
                    <Button size="sm" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Maintenance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="screenName">Screen Name</Label>
                      <Input
                        id="screenName"
                        value={screenSettings.name}
                        onChange={(e) => setScreenSettings({ ...screenSettings, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={screenSettings.location}
                        onChange={(e) => setScreenSettings({ ...screenSettings, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Brightness</Label>
                      <div className="flex items-center gap-4">
                        <Sun className="h-4 w-4" />
                        <Slider
                          value={screenSettings.brightness}
                          onValueChange={(value) => setScreenSettings({ ...screenSettings, brightness: value })}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm w-12">{screenSettings.brightness[0]}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Volume</Label>
                      <div className="flex items-center gap-4">
                        <Volume2 className="h-4 w-4" />
                        <Slider
                          value={screenSettings.volume}
                          onValueChange={(value) => setScreenSettings({ ...screenSettings, volume: value })}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm w-12">{screenSettings.volume[0]}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Power Schedule</Label>
                      <p className="text-sm text-muted-foreground">Automatically turn screen on/off based on schedule</p>
                    </div>
                    <Switch
                      checked={screenSettings.powerSchedule}
                      onCheckedChange={(checked) => setScreenSettings({ ...screenSettings, powerSchedule: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Restart</Label>
                      <p className="text-sm text-muted-foreground">Restart screen daily at 3 AM</p>
                    </div>
                    <Switch
                      checked={screenSettings.autoRestart}
                      onCheckedChange={(checked) => setScreenSettings({ ...screenSettings, autoRestart: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Update Channel</Label>
                    <Select value={screenSettings.updateChannel} onValueChange={(value) => setScreenSettings({ ...screenSettings, updateChannel: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stable">Stable</SelectItem>
                        <SelectItem value="beta">Beta</SelectItem>
                        <SelectItem value="alpha">Alpha (Developer)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings}>Save Settings</Button>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {performanceMetrics.map((metric, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{metric.label}</p>
                          <p className="text-lg font-semibold">{metric.value}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          metric.status === "excellent" ? "bg-green-500" :
                          metric.status === "good" ? "bg-blue-500" :
                          metric.status === "warning" ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Performance Chart
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 bg-muted rounded flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>Performance chart would be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Connection History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {connectionHistory.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded border">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            event.status === "Connected" ? "bg-green-500" : "bg-red-500"
                          }`} />
                          <div>
                            <p className="text-sm font-medium">{event.status}</p>
                            <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">{event.duration}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}