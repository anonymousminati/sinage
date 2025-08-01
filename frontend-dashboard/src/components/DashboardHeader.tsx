import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Bell, Settings, LogOut, Shield } from "lucide-react";
import { Badge } from "./ui/badge";

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-medium">Digital Signage Portal</h1>
                <p className="text-sm text-muted-foreground">Main Dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                3
              </Badge>
            </Button>
            
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@example.com</p>
              </div>
            </div>

            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}