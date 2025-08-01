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
import { QrCode, Copy, Download, Monitor, MapPin, Wifi, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface AddScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddScreenModal({ isOpen, onClose }: AddScreenModalProps) {
  const [step, setStep] = useState(1);
  const [screenData, setScreenData] = useState({
    name: "",
    location: "",
    description: "",
    group: "",
    resolution: ""
  });
  const [generatedId, setGeneratedId] = useState("");
  const [setupCode, setSetupCode] = useState("");

  const generateScreenCredentials = () => {
    const id = `SCR-${String(Math.floor(Math.random() * 900) + 100)}`;
    const code = Math.random().toString(36).substring(2, 15);
    setGeneratedId(id);
    setSetupCode(code);
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenData.name || !screenData.location) {
      toast.error("Please fill in all required fields");
      return;
    }
    generateScreenCredentials();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadConfig = () => {
    const config = {
      screenId: generatedId,
      setupCode: setupCode,
      serverUrl: "https://signage.yourcompany.com",
      name: screenData.name,
      location: screenData.location
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screen-config-${generatedId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration file downloaded");
  };

  const handleComplete = () => {
    toast.success("Screen added successfully!");
    setStep(1);
    setScreenData({ name: "", location: "", description: "", group: "", resolution: "" });
    setGeneratedId("");
    setSetupCode("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Display Screen</DialogTitle>
          <DialogDescription>
            Register a new screen to your digital signage network
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="screenName">Screen Name *</Label>
                <Input
                  id="screenName"
                  placeholder="e.g., Main Lobby Display"
                  value={screenData.name}
                  onChange={(e) => setScreenData({ ...screenData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A - Lobby"
                  value={screenData.location}
                  onChange={(e) => setScreenData({ ...screenData, location: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of the screen's purpose..."
                value={screenData.description}
                onChange={(e) => setScreenData({ ...screenData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group">Screen Group</Label>
                <Select value={screenData.group} onValueChange={(value) => setScreenData({ ...screenData, group: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lobby">Lobby Displays</SelectItem>
                    <SelectItem value="meeting">Meeting Rooms</SelectItem>
                    <SelectItem value="cafeteria">Cafeteria</SelectItem>
                    <SelectItem value="elevator">Elevators</SelectItem>
                    <SelectItem value="outdoor">Outdoor Displays</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution">Expected Resolution</Label>
                <Select value={screenData.resolution} onValueChange={(value) => setScreenData({ ...screenData, resolution: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                    <SelectItem value="3840x2160">3840x2160 (4K UHD)</SelectItem>
                    <SelectItem value="1366x768">1366x768 (HD)</SelectItem>
                    <SelectItem value="2560x1440">2560x1440 (2K QHD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Generate Screen Credentials
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Screen Registered Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Use the information below to configure your display device
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Monitor className="h-4 w-4" />
                    Screen Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Screen ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-muted px-2 py-1 rounded text-sm flex-1">{generatedId}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedId)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="font-medium">{screenData.name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {screenData.location}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wifi className="h-4 w-4" />
                    Connection Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Setup Code</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-muted px-2 py-1 rounded text-sm flex-1">{setupCode}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(setupCode)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Server URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-muted px-2 py-1 rounded text-sm flex-1">signage.yourcompany.com</code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard("signage.yourcompany.com")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-4 w-4" />
                  Quick Setup QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="inline-block p-4 bg-white border rounded-lg">
                  <div className="w-32 h-32 bg-muted rounded flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Scan this QR code with your display device for automatic configuration
                </p>
              </CardContent>
            </Card>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Setup Instructions:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Power on your display device</li>
                <li>Navigate to the digital signage app settings</li>
                <li>Enter the Server URL and Setup Code above, or scan the QR code</li>
                <li>The screen will automatically register and appear in your dashboard</li>
              </ol>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={downloadConfig}>
                <Download className="h-4 w-4 mr-2" />
                Download Config
              </Button>
              <Button onClick={handleComplete}>
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}