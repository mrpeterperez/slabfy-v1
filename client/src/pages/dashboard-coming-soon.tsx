import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function DashboardComingSoon() {
  const [_, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
  <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
              <Button variant="outline" onClick={() => navigate('/portfolio')}>
                View My Portfolio
              </Button>
            </div>
            
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-lg">
              <h2 className="text-xl font-semibold font-heading mb-4">Coming Soon</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                We're working on an enhanced dashboard with detailed analytics, market trends, and collection insights.
              </p>
              <p className="text-sm text-muted-foreground">
                In the meantime, you can manage your collection in the Portfolio section.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
