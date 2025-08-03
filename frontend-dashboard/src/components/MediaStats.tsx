import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Progress } from "./ui/progress";
import { 
  HardDrive, 
  Image, 
  Video, 
  TrendingUp,
  FileText,
  Clock,
  Database,
  Activity
} from "lucide-react";
import { useMediaStatistics, useMediaLoading } from "../stores/useMediaStore";

/**
 * MediaStats Component
 * 
 * Displays real-time media library statistics in a responsive grid layout.
 * Integrates with Zustand media store for automatic updates.
 */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isLoading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ icon, label, value, isLoading, trend }: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground">
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">
              {label}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">
                {value}
              </p>
              {trend && (
                <div className={`flex items-center gap-1 text-xs ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className={`h-3 w-3 ${
                    trend.isPositive ? '' : 'rotate-180'
                  }`} />
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Utility function to format file sizes in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}


export function MediaStats() {
  const statistics = useMediaStatistics();
  const isLoading = useMediaLoading();

  // Calculate storage usage percentage (assuming 1GB limit for demo)
  const storageLimit = 1024 * 1024 * 1024; // 1GB in bytes
  const storageUsagePercent = Math.min((statistics.totalSize / storageLimit) * 100, 100);

  // Calculate media type distribution
  const imagePercent = statistics.totalFiles > 0 ? (statistics.imageCount / statistics.totalFiles) * 100 : 0;
  const videoPercent = statistics.totalFiles > 0 ? (statistics.videoCount / statistics.totalFiles) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Main Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Total Files"
          value={statistics.totalFiles}
          isLoading={isLoading}
        />
        
        <StatCard
          icon={<Image className="h-4 w-4" />}
          label="Images"
          value={statistics.imageCount}
          isLoading={isLoading}
        />
        
        <StatCard
          icon={<Video className="h-4 w-4" />}
          label="Videos"
          value={statistics.videoCount}
          isLoading={isLoading}
        />
        
        <StatCard
          icon={<HardDrive className="h-4 w-4" />}
          label="Total Size"
          value={formatFileSize(statistics.totalSize)}
          isLoading={isLoading}
        />
        
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg File Size"
          value={formatFileSize(statistics.avgFileSize)}
          isLoading={isLoading}
        />
        
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Recent Files"
          value={statistics.recentCount}
          isLoading={isLoading}
        />
      </div>

      {/* Storage and Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-2">
                <Progress value={storageUsagePercent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(statistics.totalSize)} used</span>
                  <span>{formatFileSize(storageLimit)} total</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(100 - storageUsagePercent).toFixed(1)}% remaining
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Media Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="h-3 w-3 text-blue-500" />
                    <span className="text-xs">Images</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {imagePercent.toFixed(0)}%
                    </div>
                    <div className="w-16 bg-secondary rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full" 
                        style={{ width: `${imagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-3 w-3 text-purple-500" />
                    <span className="text-xs">Videos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {videoPercent.toFixed(0)}%
                    </div>
                    <div className="w-16 bg-secondary rounded-full h-1">
                      <div 
                        className="bg-purple-500 h-1 rounded-full" 
                        style={{ width: `${videoPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}