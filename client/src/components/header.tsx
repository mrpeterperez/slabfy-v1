import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { SmallLogo } from "./logo";
import { Link } from "wouter";
import { LogOut, User, Home, Settings, Menu, Calendar, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import AddAssetModalSimple from "@/features/add-asset/components/add-asset-modal/add-asset-modal-simple";
import { AddCollectionDialog } from "@/features/collections/components/add-collection-dialog";
import { AddConsignmentDialog } from "@/features/my-consignments/components";
import { AddEventDialog } from "@/features/events/components/add-event/add-event-dialog";

export function Header() {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  // Local state for creation dialogs
  const [assetOpen, setAssetOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [consignmentOpen, setConsignmentOpen] = useState(false);
  // const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setLocation("/signin");
  };

  // Generate fallback initials for avatar
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard">
                <SmallLogo />
              </Link>
            </div>

            {/* Desktop Navigation links - Hidden on mobile/tablet */}
            <nav className="ml-10 flex space-x-4 hidden lg:flex">
              {/* Home */}
              <Link href="/dashboard">
                <div className={`px-3 py-2 text-sm font-medium rounded-md ${location === "/dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Home</div>
              </Link>
              {/* My Portfolio */}
              <Link href="/portfolio">
                <div className={`px-3 py-2 text-sm font-medium rounded-md ${location.startsWith("/portfolio") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>My Portfolio</div>
              </Link>
              {/* Collections */}
              <Link href="/collections">
                <div className={`px-3 py-2 text-sm font-medium rounded-md ${location.startsWith("/collections") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Collections</div>
              </Link>
              {/* Consignments */}
              <Link href="/consignments">
                <div className={`px-3 py-2 text-sm font-medium rounded-md ${location.startsWith("/consignments") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Consignments</div>
              </Link>
              {/* Shows */}
              <Link href="/events">
                <div className={`px-3 py-2 text-sm font-medium rounded-md ${location === "/events" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Shows</div>
              </Link>
              {/* Show Storefront */}
              <Link href="/settings/show-storefront">
                <div className={`px-3 py-2 text-sm font-medium rounded-md ${location.startsWith("/settings/show-storefront") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Show Storefront</div>
              </Link>
              {/* Buying Desk */}
              <Link href="/buying-desk-v0">
                <div className={`px-3 py-2 text-sm font-medium rounded-md ${location.startsWith("/buying-desk") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Buying Desk</div>
              </Link>
              <Link href="/analytics">
                <div className={`px-3 py-2 text-sm font-medium rounded-md ${location.startsWith("/analytics") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Analytics</div>
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Add New dropdown (desktop only) */}
            <div className="hidden lg:block">
        <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="px-3 gap-1">
                    <span className="text-sm font-medium">Add New</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setAssetOpen(true)}>Asset</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCollectionOpen(true)}>Collection</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConsignmentOpen(true)}>Consignment</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocation("/buying-desk-v0")}>Buy Session</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEventOpen(true)}>Show</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ThemeToggle />

            {/* Mobile Hamburger Menu - Visible only on mobile/tablet (under 1024px) */}
            <div className="block lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Main Navigation */}
                  <DropdownMenuItem onClick={() => setLocation("/dashboard")}> 
                    Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/portfolio")}> 
                    My Portfolio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/collections")}> 
                    Collections
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/consignments")}> 
                    Consignments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/events")}> 
                    Shows
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/settings/show-storefront")}> 
                    Show Storefront
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/buying-desk-v0")}> 
                    Buying Desk
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/analytics")}> 
                    Analytics
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Profile Section */}
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Account</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>



            {/* Desktop Profile dropdown - Hidden on mobile/tablet */}
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      {user?.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} />
                      ) : null}
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      {/* Creation Dialog Portals */}
      <AddAssetModalSimple open={assetOpen} onOpenChange={setAssetOpen} />
      <AddCollectionDialog open={collectionOpen} onOpenChange={setCollectionOpen} />
      <AddConsignmentDialog isOpen={consignmentOpen} onClose={() => setConsignmentOpen(false)} />
  {/** CreateSessionDialog intentionally not mounted; flow goes to /buying-desk page */}
      <AddEventDialog open={eventOpen} onOpenChange={setEventOpen} />
    </header>
  );
}