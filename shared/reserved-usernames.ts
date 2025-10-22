/**
 * Reserved usernames that cannot be registered by users
 * These prevent conflicts with brand names, routes, and system functionality
 */

// Brand and official names
const BRAND_RESERVED = [
  'slabfy',
  'slabfyapp',
  'slabfyofficial',
  'slabfy-official',
  'slabfyteam',
  'slabfy-team',
];

// Administrative and system accounts
const ADMIN_RESERVED = [
  'admin',
  'administrator',
  'moderator',
  'mod',
  'support',
  'help',
  'team',
  'staff',
  'official',
  'verified',
];

// Technical and system reserved
const SYSTEM_RESERVED = [
  'api',
  'www',
  'mail',
  'email',
  'smtp',
  'root',
  'system',
  'null',
  'undefined',
  'void',
  'test',
  'demo',
];

// App routes to prevent URL conflicts
const ROUTE_RESERVED = [
  'dashboard',
  'signin',
  'signup',
  'login',
  'logout',
  'signout',
  'auth',
  'oauth',
  'onboarding',
  'profile',
  'settings',
  'account',
  'assets',
  'asset',
  'collections',
  'collection',
  'reports',
  'report',
  'analytics',
  'buying-desk',
  'buying',
  'desk',
  'sales',
  'channels',
  'contacts',
  'shows',
  'show',
  'storefront',
  'api',
  'about',
  'terms',
  'privacy',
  'contact',
  'help',
  'faq',
  'pricing',
  'features',
];

// Combine all reserved usernames
export const RESERVED_USERNAMES = [
  ...BRAND_RESERVED,
  ...ADMIN_RESERVED,
  ...SYSTEM_RESERVED,
  ...ROUTE_RESERVED,
].map(name => name.toLowerCase()); // Normalize to lowercase

/**
 * Check if a username is reserved
 * @param username - Username to check (case-insensitive)
 * @returns true if username is reserved
 */
export function isUsernameReserved(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase());
}

/**
 * Get a user-friendly error message for reserved usernames
 */
export function getReservedUsernameMessage(username: string): string {
  const lower = username.toLowerCase();
  
  if (BRAND_RESERVED.includes(lower)) {
    return 'This username is reserved for official Slabfy accounts';
  }
  
  if (ADMIN_RESERVED.includes(lower)) {
    return 'This username is reserved for administrative purposes';
  }
  
  if (SYSTEM_RESERVED.includes(lower) || ROUTE_RESERVED.includes(lower)) {
    return 'This username is reserved for system use';
  }
  
  return 'This username is not available';
}
