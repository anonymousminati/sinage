import { DashboardHeader } from "./DashboardHeader";
import { StatusSummary } from "./StatusSummary";
import { QuickActions } from "./QuickActions";
import { ScreenGrid } from "./ScreenGrid";
import { ActivityFeed } from "./ActivityFeed";

export function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="p-6 space-y-6">
        {/* Status Summary */}
        <section>
          <h2 className="text-lg font-medium mb-4">System Overview</h2>
          <StatusSummary />
        </section>

        {/* Quick Actions */}
        <section>
          <QuickActions />
        </section>

        {/* Main Content Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Screen Status - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <ScreenGrid />
          </div>
          
          {/* Activity Feed - Takes up 1 column on large screens */}
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </section>
      </main>
    </div>
  );
}