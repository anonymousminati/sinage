
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { Dashboard } from "./components/Dashboard";
import { ScreenManagement } from "./components/ScreenManagement";
import { MediaLibrary } from "./components/MediaLibrary";
import { PlaylistEditor } from "./components/PlaylistEditor";
import { RealTimeControl } from "./components/RealTimeControl";
import { Navigation } from "./components/Navigation";
import { Registration } from "./components/Registration";
import { Login } from "./components/Login";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Loading component for authentication initialization
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    </div>
  );
}

/**
 * Main application component wrapped with authentication
 */
function AppContent() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [authPage, setAuthPage] = useState<"login" | "register">("login");

  // Show loading screen while initializing authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

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

  // Show authentication pages if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {authPage === "login" ? (
          <Login onSwitchToRegister={() => setAuthPage("register")} />
        ) : (
          <Registration onSwitchToLogin={() => setAuthPage("login")} />
        )}
        <Toaster />
      </>
    );
  }

  // Show main application if authenticated
  return (
    <>
      <div className="min-h-screen bg-background">
        <Navigation 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          onLogout={logout}
        />
        {renderCurrentPage()}
        <Toaster />
      </div>
    </>
  );
}

/**
 * Root App component with providers
 */
export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}