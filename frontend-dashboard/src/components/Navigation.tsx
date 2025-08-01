import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Monitor, Home, Settings, Shield, Images, ListVideo, Activity } from "lucide-react";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      count: null
    },
    {
      id: "screens",
      label: "Screen Management", 
      icon: Monitor,
      count: 24
    },
    {
      id: "media",
      label: "Media Library",
      icon: Images,
      count: 156
    },
    {
      id: "playlists",
      label: "Playlist Editor",
      icon: ListVideo,
      count: 12
    },
    {
      id: "control",
      label: "Real-Time Control",
      icon: Activity,
      count: null
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      count: null
    }
  ];

  return (
    <nav className="border-b border-border bg-card">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-medium">Digital Signage Portal</h1>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onPageChange(item.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.count && (
                    <Badge variant="secondary" className="ml-1">
                      {item.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}