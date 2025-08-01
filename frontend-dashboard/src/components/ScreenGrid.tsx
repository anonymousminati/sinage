import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Monitor, Wifi, WifiOff, Clock, MapPin } from "lucide-react";

export function ScreenGrid() {
  const screens = [
    {
      id: "SCR-001",
      name: "Main Lobby Display",
      location: "Building A - Lobby",
      status: "online",
      currentContent: "Welcome Playlist",
      lastSeen: "2 min ago",
      uptime: "99.8%"
    },
    {
      id: "SCR-002", 
      name: "Cafeteria Menu Board",
      location: "Building A - Cafeteria",
      status: "online",
      currentContent: "Daily Menu",
      lastSeen: "1 min ago",
      uptime: "98.2%"
    },
    {
      id: "SCR-003",
      name: "Conference Room A",
      location: "Building B - Room 201",
      status: "offline",
      currentContent: "Schedule Display",
      lastSeen: "15 min ago",
      uptime: "95.1%"
    },
    {
      id: "SCR-004",
      name: "Reception Display",
      location: "Building A - Reception",
      status: "online",
      currentContent: "Company News",
      lastSeen: "30 sec ago",
      uptime: "99.9%"
    },
    {
      id: "SCR-005",
      name: "Elevator Display 1",
      location: "Building A - Elevator",
      status: "warning",
      currentContent: "Building Info",
      lastSeen: "8 min ago",
      uptime: "97.5%"
    },
    {
      id: "SCR-006",
      name: "Parking Display",
      location: "Parking Garage",
      status: "online",
      currentContent: "Parking Status",
      lastSeen: "45 sec ago",
      uptime: "99.1%"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "online":
        return "default" as const;
      case "offline":
        return "destructive" as const;
      case "warning":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Screen Status</span>
          </div>
          <Badge variant="outline">{screens.length} displays</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screens.map((screen) => (
            <Card key={screen.id} className="relative">
              <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(screen.status)}`} />
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">{screen.name}</h4>
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      {screen.location}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={getStatusVariant(screen.status)} className="text-xs">
                        {screen.status === "online" && <Wifi className="h-3 w-3 mr-1" />}
                        {screen.status === "offline" && <WifiOff className="h-3 w-3 mr-1" />}
                        {screen.status === "warning" && <Clock className="h-3 w-3 mr-1" />}
                        {screen.status}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-sm text-muted-foreground">Current Content</span>
                      <p className="text-sm font-medium">{screen.currentContent}</p>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Last seen: {screen.lastSeen}</span>
                      <span>Uptime: {screen.uptime}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}