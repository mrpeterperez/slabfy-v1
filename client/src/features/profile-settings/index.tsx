/*
 * This file contains the main profile settings component.
 * Exports: ProfileSettings component
 * Feature: profile-settings
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProfileSection } from "./profile-section";
import { UsernameSection } from "./username-section";
import { PersonalizationSection } from "./personalization-section";
import { AccountSection } from "./account-section";
import { ProfileSettingsNavigation } from "./navigation";

export function ProfileSettings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");

  if (!user) {
    return null; // Protected route will redirect
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 container max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold font-heading mb-6">Profile Settings</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left side navigation */}
          <ProfileSettingsNavigation 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
          
          {/* Right side content */}
          <div className="flex-1">
            {activeSection === "profile" && <ProfileSection user={user} />}
            {activeSection === "username" && <UsernameSection user={user} />}
            {activeSection === "personalization" && <PersonalizationSection user={user} />}
            {activeSection === "account" && <AccountSection user={user} />}
          </div>
        </div>
      </main>
    </div>
  );
}