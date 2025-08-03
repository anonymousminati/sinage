import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { ScreenManagement } from "../components/ScreenManagement";
import { MediaLibrary } from "../components/MediaLibrary";
import { PlaylistEditor } from "../components/PlaylistEditor";
import { RealTimeControl } from "../components/RealTimeControl";
import { Navigation } from "../components/Navigation";
import { useAuth } from "../contexts/AuthContext";

export function DashboardPage() {
  const { logout } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "screens":
        return (
          <div className="min-h-screen bg-background">
            <main className="p-6">
              <ScreenManagement />
            </main>
          </div>
        );
      case "media":
        return (
          <div className="min-h-screen bg-background">
            <main className="p-6">
              <MediaLibrary />
            </main>
          </div>
        );
      case "playlists":
        return (
          <div className="min-h-screen bg-background">
            <main className="p-6">
              <PlaylistEditor />
            </main>
          </div>
        );
      case "control":
        return (
          <div className="min-h-screen bg-background">
            <main className="p-6">
              <RealTimeControl />
            </main>
          </div>
        );
      case "settings":
        return (
          <div className="min-h-screen bg-background">
            <main className="p-6">
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold mb-2">Settings</h2>
                <p className="text-muted-foreground">Settings page coming soon...</p>
              </div>
            </main>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        onLogout={logout}
      />
      {renderCurrentPage()}
    </div>
  );
}