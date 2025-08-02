
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

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPage, setAuthPage] = useState<"login" | "register">("login");

  const handleLoginSuccess = (data: { email: string }) => {
    console.log("Login successful:", data);
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
  };

  const handleRegistrationSuccess = (data: { name: string; email: string }) => {
    console.log("Registration successful:", data);
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage("dashboard");
    setAuthPage("login");
  };

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
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        {authPage === "login" ? (
          <Login
            onSwitchToRegister={() => setAuthPage("register")}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <Registration
            onSwitchToLogin={() => setAuthPage("login")}
            onRegistrationSuccess={handleRegistrationSuccess}
          />
        )}
        <Toaster />
      </ThemeProvider>
    );
  }

  // Show main application if authenticated
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background">
        <Navigation 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          onLogout={handleLogout}
        />
        {renderCurrentPage()}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}