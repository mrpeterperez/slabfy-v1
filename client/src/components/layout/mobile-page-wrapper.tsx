// Mobile Page Wrapper
// Wraps main pages with profile header and profile menu functionality
// Only renders on mobile/tablet (lg:hidden)

import { useState } from "react";
import { MobileProfileHeader } from "./mobile-profile-header";
import { MobileProfileSettingsMenu } from "./mobile-profile-settings-menu";
import { MobileProfileDetails } from "./mobile-profile-details";
import { MobileUsernamePage } from "./mobile-username-page";
import { MobilePersonalizationPage } from "./mobile-personalization-page";
import { MobileAccountPage } from "./mobile-account-page";

interface MobilePageWrapperProps {
  children: React.ReactNode;
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function MobilePageWrapper({ children, showSearch = true, onSearchClick }: MobilePageWrapperProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

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

  return (
    <>
      {/* Mobile Header */}
      <MobileProfileHeader
        onProfileClick={() => setShowProfileMenu(true)}
        onSearchClick={showSearch ? onSearchClick : undefined}
      />

      {/* Spacer for fixed header - 64px (h-16) */}
      <div className="lg:hidden h-16" aria-hidden />

      {/* Page Content */}
      {children}

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
    </>
  );
}

