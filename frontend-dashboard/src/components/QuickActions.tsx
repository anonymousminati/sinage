import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Plus, Upload, ListPlus, StopCircle, Zap } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Add New Screen",
      description: "Connect a new display",
      icon: Plus,
      variant: "default" as const,
      className: "bg-primary text-primary-foreground hover:bg-primary/90"
    },
    {
      title: "Upload Media",
      description: "Add content files",
      icon: Upload,
      variant: "outline" as const
    },
    {
      title: "Create Playlist",
      description: "Organize content",
      icon: ListPlus,
      variant: "outline" as const
    },
    {
      title: "Emergency Stop",
      description: "Stop all displays",
      icon: StopCircle,
      variant: "destructive" as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                className={`h-auto p-4 flex flex-col items-center space-y-2 ${action.className || ''}`}
              >
                <Icon className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-70">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}