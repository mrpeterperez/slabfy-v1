/**
 * Authentication utilities for API requests
 */

/**
 * Gets authentication headers for authenticated API requests
 * Retrieves the current user's session token from Supabase
 * 
 * @returns Object containing Authorization header with Bearer token, or empty object if no auth
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!(window as any).supabase) {
    console.warn('Supabase client not available');
    return {};
  }
  
  try {
    const { data: { session } } = await (window as any).supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    console.warn('Could not get auth token for upload', e);
    return {};
  }
}
