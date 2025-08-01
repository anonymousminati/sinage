import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Monitor, 
  Upload, 
  ListPlus, 
  WifiOff, 
  Wifi, 
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

export function ActivityFeed() {
  const activities = [
    {
      id: 1,
      type: "screen_online",
      title: "Conference Room A came online",
      description: "SCR-003 reconnected after maintenance",
      timestamp: "2 minutes ago",
      icon: Wifi,
      color: "text-green-600",
      badge: { text: "Online", variant: "default" as const }
    },
    {
      id: 2,
      type: "media_upload",
      title: "New media uploaded",
      description: "holiday-promo-2024.mp4 added to library",
      timestamp: "5 minutes ago",
      icon: Upload,
      color: "text-blue-600",
      badge: { text: "Media", variant: "secondary" as const }
    },
    {
      id: 3,
      type: "playlist_created",
      title: "Playlist created",
      description: "Holiday Promotions playlist with 5 items",
      timestamp: "12 minutes ago",
      icon: ListPlus,
      color: "text-purple-600",
      badge: { text: "Playlist", variant: "outline" as const }
    },
    {
      id: 4,
      type: "screen_offline",
      title: "Elevator Display 1 connection issue",
      description: "SCR-005 hasn't checked in for 8 minutes",
      timestamp: "15 minutes ago",
      icon: WifiOff,
      color: "text-yellow-600",
      badge: { text: "Warning", variant: "secondary" as const }
    },
    {
      id: 5,
      type: "content_updated",
      title: "Content deployment completed",
      description: "Welcome Playlist deployed to 3 screens",
      timestamp: "23 minutes ago",
      icon: CheckCircle,
      color: "text-green-600",
      badge: { text: "Success", variant: "default" as const }
    },
    {
      id: 6,
      type: "alert",
      title: "Storage space warning",
      description: "Media library at 85% capacity",
      timestamp: "1 hour ago",
      icon: AlertTriangle,
      color: "text-red-600",
      badge: { text: "Alert", variant: "destructive" as const }
    },
    {
      id: 7,
      type: "screen_added",
      title: "New screen registered",
      description: "Parking Display SCR-006 added to network",
      timestamp: "2 hours ago",
      icon: Monitor,
      color: "text-blue-600",
      badge: { text: "New", variant: "outline" as const }
    },
    {
      id: 8,
      type: "maintenance",
      title: "Scheduled maintenance completed",
      description: "System backup and optimization finished",
      timestamp: "3 hours ago",
      icon: CheckCircle,
      color: "text-green-600",
      badge: { text: "System", variant: "secondary" as const }
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="space-y-1 p-4">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div 
                  key={activity.id} 
                  className={`flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                    index !== activities.length - 1 ? 'border-b border-border/50' : ''
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-muted ${activity.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                      <Badge variant={activity.badge.variant} className="text-xs ml-2">
                        {activity.badge.text}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">{activity.timestamp}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}