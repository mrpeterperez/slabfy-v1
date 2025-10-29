// Mobile Shows Page
// Purpose: Mobile-optimized shows/events listing with metrics and filters

import { useState } from "react";
import { useLocation } from "wouter";
import { MobileProfileHeader } from "@/components/layout/mobile-profile-header";
import { MobileProfileSettingsMenu } from "@/components/layout/mobile-profile-settings-menu";
import { MobileProfileDetails } from "@/components/layout/mobile-profile-details";
import { MobileUsernamePage } from "@/components/layout/mobile-username-page";
import { MobilePersonalizationPage } from "@/components/layout/mobile-personalization-page";
import { MobileAccountPage } from "@/components/layout/mobile-account-page";
import { usePageTitle } from "@/hooks/use-page-title";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Settings, Calendar } from "lucide-react";
import { useEvents } from "@/features/events/hooks/use-events";
import { ShowCard } from "./components/show-card";

export function ShowsMobile() {
  usePageTitle("Shows");
  
  const [, setLocation] = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);
  const [timeFilter, setTimeFilter] = useState("last-30-days");
  const [showArchived, setShowArchived] = useState(false);
  const [showDateDrawer, setShowDateDrawer] = useState(false);

    const getFilterLabel = (filter: string) => {
    const labels: Record<string, string> = {
      'last-7-days': 'Last 7D',
      'last-30-days': 'Last 30D',
      'last-90-days': 'Last 90D',
      'last-365-days': 'Last Year',
      'all-time': 'All Time'
    };
    return labels[filter] || 'Last 30D';
  };

  // Touch handlers for swipe detection
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndY, setTouchEndY] = useState(0);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart - touchEnd;
    const distanceY = Math.abs(touchStartY - touchEndY);
    
    // Only trigger swipe if horizontal movement is greater than vertical (not scrolling)
    if (distanceY > 30) return; // User is scrolling vertically, ignore
    
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (isLeftSwipe && !showArchived) {
      setShowArchived(true); // Swipe left to Archived
    }
    if (isRightSwipe && showArchived) {
      setShowArchived(false); // Swipe right to Active
    }
  };

  const handleNavigate = (section: string) => {
    setShowProfileMenu(false);

    switch (section) {
      case "profile":
        setShowProfileDetails(true);
        break;
      case "username":
        setShowUsername(true);
        break;
      case "personalization":
        setShowPersonalization(true);
        break;
      case "account":
        setShowAccount(true);
        break;
    }
  };

  const handleBackToMenu = () => {
    setShowProfileDetails(false);
    setShowUsername(false);
    setShowPersonalization(false);
    setShowAccount(false);
    setShowProfileMenu(true);
  };

  // Load events data
  const { data: events, isLoading } = useEvents(showArchived);

  // Calculate metrics from events
  const metrics = {
    totalShows: events?.length ?? 0,
    revenue: events?.reduce((sum, e) => sum + (e.revenue ?? 0), 0) ?? 0,
    cardsSold: events?.reduce((sum, e) => sum + (e.soldCount ?? 0), 0) ?? 0,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Mobile Header */}
      <MobileProfileHeader
        onProfileClick={() => setShowProfileMenu(true)}
        onSearchClick={() => setShowSearchDrawer(true)}
      />

      {/* Main Content - starts below header */}
      <div 
        className="pt-16 min-h-screen"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Title Section with Settings and Date Filter */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            {/* Title + Settings */}
            <div className="flex items-center gap-3">
              <h1 className="text-[34px] font-bold leading-none">Shows</h1>
              <button
                className="flex items-center justify-center w-10 h-10"
                aria-label="Settings"
              >
                <Settings className="h-6 w-6" />
              </button>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDateDrawer(true)}
                className="h-9"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {getFilterLabel(timeFilter)}
              </Button>
            </div>
          </div>

          {/* Metric Cards - Horizontal Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-0 -mx-4 px-4 scrollbar-hide">
            {/* Total Shows Card */}
            <div className="flex-shrink-0 w-[148px] h-[98px] bg-card rounded-lg border p-4 flex flex-col justify-between">
              <div className="text-sm text-muted-foreground">Total Shows</div>
              <div className="text-2xl font-bold">{metrics.totalShows}</div>
            </div>

            {/* Revenue Card */}
            <div className="flex-shrink-0 w-[148px] h-[98px] bg-card rounded-lg border p-4 flex flex-col justify-between">
              <div className="text-sm text-muted-foreground">Revenue</div>
              <div className="text-2xl font-bold">
                ${metrics.revenue.toLocaleString()}
              </div>
            </div>

            {/* Cards Sold Card */}
            <div className="flex-shrink-0 w-[148px] h-[98px] bg-card rounded-lg border p-4 flex flex-col justify-between">
              <div className="text-sm text-muted-foreground">Cards Sold</div>
              <div className="text-2xl font-bold">{metrics.cardsSold}</div>
            </div>
          </div>
        </div>

        {/* Tabs - Active/Archived */}
        <div className="border-b px-4 mt-0">
          <nav className="flex gap-6">
            <button
              onClick={() => setShowArchived(false)}
              className={`py-3 text-base font-medium border-b-2 transition-colors ${
                !showArchived
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`py-3 text-base font-medium border-b-2 transition-colors ${
                showArchived
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              Archived
            </button>
          </nav>
        </div>

        {/* Shows List */}
        <div className="pt-4">
          <div className="space-y-0">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[120px] bg-card border-b animate-pulse" />
              ))
            ) : events && events.length > 0 ? (
              events.map((event) => (
                <ShowCard 
                  key={event.id}
                  event={event} 
                  onClick={() => setLocation(`/events/${event.id}`)}
                />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground px-4">
                No shows yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Settings Menu */}
      <MobileProfileSettingsMenu
        isOpen={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onNavigate={handleNavigate}
      />

      {/* Profile Details Page */}
      <MobileProfileDetails
        isOpen={showProfileDetails}
        onClose={handleBackToMenu}
      />

      {/* Username Page */}
      <MobileUsernamePage
        isOpen={showUsername}
        onClose={handleBackToMenu}
      />

      {/* Personalization Page */}
      <MobilePersonalizationPage
        isOpen={showPersonalization}
        onClose={handleBackToMenu}
      />

      {/* Account Page */}
      <MobileAccountPage
        isOpen={showAccount}
        onClose={handleBackToMenu}
      />

      {/* Search Drawer - TODO */}

      {/* Date Filter Drawer */}
      <Drawer open={showDateDrawer} onOpenChange={setShowDateDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Time Period</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            {[
              { value: 'last-7-days', label: 'Last 7 Days' },
              { value: 'last-30-days', label: 'Last 30 Days' },
              { value: 'last-90-days', label: 'Last 90 Days' },
              { value: 'last-365-days', label: 'Last Year' },
              { value: 'all-time', label: 'All Time' }
            ].map((option) => (
              <Button
                key={option.value}
                variant={timeFilter === option.value ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setTimeFilter(option.value);
                  setShowDateDrawer(false);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
