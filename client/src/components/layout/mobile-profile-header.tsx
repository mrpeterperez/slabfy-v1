// Mobile/Tablet Profile Header
// Shows avatar (left) + search icon (right) on top-level pages
// Only visible on mobile/tablet (lg:hidden)

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface MobileProfileHeaderProps {
  onProfileClick: () => void;
  onSearchClick?: () => void;
}

export function MobileProfileHeader({ onProfileClick, onSearchClick }: MobileProfileHeaderProps) {
  const { user } = useAuth();

  const getInitials = () => {
    if (user?.name) {
      return user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="lg:hidden fixed top-0 inset-x-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto w-full px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Avatar - Left */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            aria-label="Open profile settings"
          >
            <Avatar className="h-10 w-10">
              {user?.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name || user.email} />
              ) : null}
              <AvatarFallback className="text-sm font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* Search - Right */}
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              className="flex items-center justify-center min-w-[48px] min-h-[48px]"
              aria-label="Search"
            >
              <Search className="h-7 w-7" />
            </button>
          )}
        </div>
      </div>
      {/* Safe area padding */}
      <div className="pt-[env(safe-area-inset-top)]" aria-hidden />
    </div>
  );
}
