import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Monitor, Wifi, WifiOff, FileImage, List, AlertTriangle } from "lucide-react";
import { Badge } from "./ui/badge";

export function StatusSummary() {
  const stats = [
    {
      title: "Total Screens",
      value: "24",
      icon: Monitor,
      description: "Managed displays",
      color: "text-blue-600"
    },
    {
      title: "Online",
      value: "21",
      icon: Wifi,
      description: "Active displays",
      color: "text-green-600",
      badge: { text: "87.5%", variant: "default" as const }
    },
    {
      title: "Offline",
      value: "3",
      icon: WifiOff,
      description: "Needs attention",
      color: "text-red-600",
      badge: { text: "12.5%", variant: "destructive" as const }
    },
    {
      title: "Media Files",
      value: "156",
      icon: FileImage,
      description: "Ready to deploy",
      color: "text-purple-600"
    },
    {
      title: "Active Playlists",
      value: "8",
      icon: List,
      description: "Currently running",
      color: "text-orange-600"
    },
    {
      title: "Alerts",
      value: "2",
      icon: AlertTriangle,
      description: "Require action",
      color: "text-yellow-600",
      badge: { text: "New", variant: "secondary" as const }
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.badge && (
                  <Badge variant={stat.badge.variant} className="text-xs">
                    {stat.badge.text}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}