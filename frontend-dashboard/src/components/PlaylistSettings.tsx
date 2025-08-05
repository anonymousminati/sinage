"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Settings, 
  Clock, 
  Calendar, 
  Repeat, 
  Shuffle, 
  Volume2, 
  Monitor,
  Palette,
  Zap,
  Info
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import type { 
  Playlist, 
  PlaylistTransition, 
  PlaylistSchedule,
  PlaylistCondition 
} from "../types";

interface PlaylistSettingsProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: PlaylistSettingsData) => void;
  className?: string;
}

interface PlaylistSettingsData {
  // Basic settings
  name: string;
  description: string;
  isActive: boolean;
  
  // Playback settings
  loop: boolean;
  shuffle: boolean;
  autoAdvance: boolean;
  
  // Transition settings
  defaultTransition: PlaylistTransition;
  transitionDuration: number;
  
  // Timing settings
  defaultItemDuration: number;
  allowDurationOverride: boolean;
  
  // Schedule settings
  schedule?: PlaylistSchedule;
  
  // Advanced settings
  priority: number;
  conditions: PlaylistCondition[];
  
  // Display settings
  backgroundColor: string;
  textColor: string;
  showMetadata: boolean;
}

const defaultTransition: PlaylistTransition = {
  type: 'fade',
  duration: 500,
  easing: 'ease-in-out'
};

const defaultSchedule: PlaylistSchedule = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  weekdays: [1, 2, 3, 4, 5] // Monday to Friday
};

export function PlaylistSettings({ 
  playlist, 
  isOpen, 
  onClose, 
  onSave,
  className 
}: PlaylistSettingsProps) {
  const [settings, setSettings] = useState<PlaylistSettingsData>({
    name: '',
    description: '',
    isActive: true,
    loop: false,
    shuffle: false,
    autoAdvance: true,
    defaultTransition,
    transitionDuration: 500,
    defaultItemDuration: 10,
    allowDurationOverride: true,
    priority: 1,
    conditions: [],
    backgroundColor: '#000000',
    textColor: '#ffffff',
    showMetadata: true
  });
  
  const [activeTab, setActiveTab] = useState("general");
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize settings when playlist changes
  useEffect(() => {
    if (playlist && isOpen) {
      setSettings({
        name: playlist.name,
        description: playlist.description,
        isActive: playlist.isActive,
        loop: false, // Would come from playlist settings in real implementation
        shuffle: false,
        autoAdvance: true,
        defaultTransition,
        transitionDuration: 500,
        defaultItemDuration: 10,
        allowDurationOverride: true,
        priority: 1,
        conditions: [],
        backgroundColor: '#000000',
        textColor: '#ffffff',
        showMetadata: true,
        schedule: playlist.schedule
      });
      setHasChanges(false);
    }
  }, [playlist, isOpen]);

  const updateSetting = <K extends keyof PlaylistSettingsData>(
    key: K,
    value: PlaylistSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateTransition = (updates: Partial<PlaylistTransition>) => {
    setSettings(prev => ({
      ...prev,
      defaultTransition: { ...prev.defaultTransition, ...updates }
    }));
    setHasChanges(true);
  };

  const updateSchedule = (updates: Partial<PlaylistSchedule>) => {
    setSettings(prev => ({
      ...prev,
      schedule: { ...defaultSchedule, ...prev.schedule, ...updates }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!playlist) return;
    
    onSave?.(settings);
    toast.success("Playlist settings saved successfully");
    setHasChanges(false);
    onClose();
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirm = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!confirm) return;
    }
    onClose();
  };

  const toggleWeekday = (day: number) => {
    const currentWeekdays = settings.schedule?.weekdays || [];
    const newWeekdays = currentWeekdays.includes(day)
      ? currentWeekdays.filter(d => d !== day)
      : [...currentWeekdays, day].sort();
    
    updateSchedule({ weekdays: newWeekdays });
  };

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!playlist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] p-0", className)}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3">
            <Settings className="h-5 w-5" />
            Playlist Settings: {playlist.name}
            {hasChanges && (
              <Badge variant="secondary" className="ml-2">
                Unsaved changes
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="playback" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Playback
              </TabsTrigger>
              <TabsTrigger value="transitions" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Transitions
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Display
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-y-auto">
              {/* General Settings */}
              <TabsContent value="general" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Playlist Name</Label>
                      <Input
                        id="name"
                        value={settings.name}
                        onChange={(e) => updateSetting('name', e.target.value)}
                        placeholder="Enter playlist name..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={settings.description}
                        onChange={(e) => updateSetting('description', e.target.value)}
                        placeholder="Describe this playlist..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Active Status</Label>
                        <div className="text-sm text-muted-foreground">
                          Enable this playlist for display on screens
                        </div>
                      </div>
                      <Switch
                        checked={settings.isActive}
                        onCheckedChange={(checked) => updateSetting('isActive', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Priority & Conditions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Priority Level: {settings.priority}</Label>
                      <Slider
                        value={[settings.priority]}
                        onValueChange={([value]) => updateSetting('priority', value)}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low (1)</span>
                        <span>High (10)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Playback Settings */}
              <TabsContent value="playback" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Playback Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Loop Playlist</Label>
                        <div className="text-sm text-muted-foreground">
                          Restart from the beginning when playlist ends
                        </div>
                      </div>
                      <Switch
                        checked={settings.loop}
                        onCheckedChange={(checked) => updateSetting('loop', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Shuffle Items</Label>
                        <div className="text-sm text-muted-foreground">
                          Play items in random order
                        </div>
                      </div>
                      <Switch
                        checked={settings.shuffle}
                        onCheckedChange={(checked) => updateSetting('shuffle', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Advance</Label>
                        <div className="text-sm text-muted-foreground">
                          Automatically move to next item
                        </div>
                      </div>
                      <Switch
                        checked={settings.autoAdvance}
                        onCheckedChange={(checked) => updateSetting('autoAdvance', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Timing Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Default Item Duration: {settings.defaultItemDuration}s</Label>
                      <Slider
                        value={[settings.defaultItemDuration]}
                        onValueChange={([value]) => updateSetting('defaultItemDuration', value)}
                        min={1}
                        max={300}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1s</span>
                        <span>5min</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Duration Override</Label>
                        <div className="text-sm text-muted-foreground">
                          Let individual items override default duration
                        </div>
                      </div>
                      <Switch
                        checked={settings.allowDurationOverride}
                        onCheckedChange={(checked) => updateSetting('allowDurationOverride', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transition Settings */}
              <TabsContent value="transitions" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Default Transitions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Transition Type</Label>
                      <Select
                        value={settings.defaultTransition.type}
                        onValueChange={(value: any) => updateTransition({ type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="slide">Slide</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Transition Duration: {settings.defaultTransition.duration}ms</Label>
                      <Slider
                        value={[settings.defaultTransition.duration]}
                        onValueChange={([value]) => updateTransition({ duration: value })}
                        min={100}
                        max={3000}
                        step={100}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0.1s</span>
                        <span>3s</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Easing</Label>
                      <Select
                        value={settings.defaultTransition.easing}
                        onValueChange={(value: any) => updateTransition({ easing: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ease-in">Ease In</SelectItem>
                          <SelectItem value="ease-out">Ease Out</SelectItem>
                          <SelectItem value="ease-in-out">Ease In Out</SelectItem>
                          <SelectItem value="linear">Linear</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Schedule Settings */}
              <TabsContent value="schedule" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Schedule Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={settings.schedule?.startDate || ''}
                          onChange={(e) => updateSchedule({ startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={settings.schedule?.endDate || ''}
                          onChange={(e) => updateSchedule({ endDate: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={settings.schedule?.startTime || ''}
                          onChange={(e) => updateSchedule({ startTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={settings.schedule?.endTime || ''}
                          onChange={(e) => updateSchedule({ endTime: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Active Days</Label>
                      <div className="flex gap-2">
                        {weekdayNames.map((day, index) => (
                          <Button
                            key={index}
                            variant={settings.schedule?.weekdays?.includes(index) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleWeekday(index)}
                            className="min-w-[3rem]"
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select
                        value={settings.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                        onValueChange={(value) => updateSchedule({ timezone: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Display Settings */}
              <TabsContent value="display" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Visual Appearance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={settings.backgroundColor}
                            onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                            className="w-12 h-10 p-1 border-2"
                          />
                          <Input
                            value={settings.backgroundColor}
                            onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={settings.textColor}
                            onChange={(e) => updateSetting('textColor', e.target.value)}
                            className="w-12 h-10 p-1 border-2"
                          />
                          <Input
                            value={settings.textColor}
                            onChange={(e) => updateSetting('textColor', e.target.value)}
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Metadata</Label>
                        <div className="text-sm text-muted-foreground">
                          Display file names and information overlays
                        </div>
                      </div>
                      <Switch
                        checked={settings.showMetadata}
                        onCheckedChange={(checked) => updateSetting('showMetadata', checked)}
                      />
                    </div>
                    
                    {/* Preview */}
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div 
                        className="w-full h-20 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-sm"
                        style={{ 
                          backgroundColor: settings.backgroundColor,
                          color: settings.textColor
                        }}
                      >
                        <Monitor className="h-6 w-6 mr-2" />
                        Sample content display
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center p-6 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {hasChanges && "You have unsaved changes"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}