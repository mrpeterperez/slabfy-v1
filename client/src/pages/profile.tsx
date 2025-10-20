import { ProfileSettings } from "@/features/profile-settings";
import { usePageTitle } from "@/hooks/use-page-title";

export default function Profile() {
  usePageTitle('Profile');
  return <ProfileSettings />;
}
