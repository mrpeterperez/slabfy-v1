// Load environment variables for local development
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // Also load .env as fallback

import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseEdgeServiceKey = process.env.SUPABASE_EDGE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY!;

// Create a Supabase client with service key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create a separate Supabase client for Edge Functions with JWT authentication
export const supabaseEdge = createClient(supabaseUrl, supabaseEdgeServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Upload avatar image to Supabase storage
 * @param file - The uploaded file buffer
 * @param userId - User ID for unique file naming
 * @param fileName - Original filename for extension extraction
 * @returns Promise with public URL or error
 */
export async function uploadAvatar(file: Buffer, userId: string, fileName: string): Promise<string> {
  try {
    // Extract file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Create unique filename: userId_timestamp.extension (best practice)
    const uniqueFileName = `${userId}_${Date.now()}.${fileExtension}`;
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('user-avatars')
      .upload(uniqueFileName, file, {
        contentType: `image/${fileExtension}`,
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Avatar upload error:', error);
    throw error;
  }
}

/**
 * Delete avatar from Supabase storage
 * @param avatarUrl - The current avatar URL to extract filename
 * @returns Promise<boolean> - Success status
 */
export async function deleteAvatar(avatarUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const fileName = avatarUrl.split('/').pop();
    if (!fileName) {
      console.warn('Could not extract filename from avatar URL:', avatarUrl);
      return false;
    }

    const { error } = await supabase.storage
      .from('user-avatars')
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Avatar delete error:', error);
    return false;
  }
}

/**
 * Upload asset image to Supabase storage
 * @param file - The image file buffer
 * @param userId - User ID for organizing files
 * @param fileName - Original filename
 * @returns Promise<string> - Public URL of uploaded image
 */
export async function uploadAssetImage(file: Buffer, userId: string, fileName: string): Promise<string> {
  try {
    console.log(`📤 Starting asset image upload for user ${userId}`, {
      fileSize: file.length,
      fileName,
      bufferType: Buffer.isBuffer(file)
    });

    // Extract file extension and normalize MIME type
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Map file extension to proper MIME type (support all devices/platforms)
    const mimeTypeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'heic': 'image/heic',
      'heif': 'image/heif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'tif': 'image/tiff'
    };
    
    const contentType = mimeTypeMap[fileExtension] || 'image/jpeg';
    
    // Create unique filename: userId_timestamp_random.extension
    const uniqueFileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    console.log(`📝 Generated unique filename: ${uniqueFileName}`, {
      fileExtension,
      contentType
    });

    // Upload to Supabase storage (public-assets bucket)
    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload(uniqueFileName, file, {
        contentType,
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('❌ Supabase upload error:', {
        message: error.message,
        error: JSON.stringify(error)
      });
      throw new Error(`Failed to upload asset image: ${error.message}`);
    }

    console.log(`✅ Upload successful, getting public URL for: ${data.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(data.path);

    console.log(`🔗 Public URL generated: ${urlData.publicUrl}`);

    return urlData.publicUrl;
  } catch (error) {
    console.error('💥 Asset image upload error:', error);
    throw error;
  }
}

/**
 * Delete asset image from Supabase storage
 * @param imageUrl - The current image URL to extract filename
 * @returns Promise<boolean> - Success status
 */
export async function deleteAssetImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const fileName = imageUrl.split('/').pop();
    if (!fileName) {
      console.warn('Could not extract filename from asset image URL:', imageUrl);
      return false;
    }

    const { error } = await supabase.storage
      .from('public-assets')
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Asset image delete error:', error);
    return false;
  }
}

/**
 * Upload collection image to Supabase storage
 * @param file - The image file buffer
 * @param userId - User ID for organizing files
 * @param fileName - Original filename
 * @returns Promise<string> - Public URL of uploaded image
 */
export async function uploadCollectionImage(file: Buffer, userId: string, fileName: string): Promise<string> {
  try {
    // Extract file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Create unique filename: userId_timestamp_random.extension
    const uniqueFileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('collection-images')
      .upload(uniqueFileName, file, {
        contentType: `image/${fileExtension}`,
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload collection image: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('collection-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Collection image upload error:', error);
    throw error;
  }
}

/**
 * Delete collection image from Supabase storage
 * @param imageUrl - The current image URL to extract filename
 * @returns Promise<boolean> - Success status
 */
export async function deleteCollectionImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const fileName = imageUrl.split('/').pop();
    if (!fileName) {
      console.warn('Could not extract filename from collection image URL:', imageUrl);
      return false;
    }

    const { error } = await supabase.storage
      .from('collection-images')
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Collection image delete error:', error);
    return false;
  }
}

/**
 * Upload event logo to Supabase storage
 * @param file - The image file buffer
 * @param userId - User ID for organizing files
 * @param fileName - Original filename
 * @returns Promise<string> - Public URL of uploaded image
 */
export async function uploadEventLogo(file: Buffer, userId: string, fileName: string): Promise<string> {
  try {
    // Extract file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Create unique filename: userId_timestamp_random.extension
    const uniqueFileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('show-images')
      .upload(uniqueFileName, file, {
        contentType: `image/${fileExtension}`,
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload event logo: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('show-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Event logo upload error:', error);
    throw error;
  }
}

/**
 * Delete event logo from Supabase storage
 * @param imageUrl - The current image URL to extract filename
 * @returns Promise<boolean> - Success status
 */
export async function deleteEventLogo(imageUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const fileName = imageUrl.split('/').pop();
    if (!fileName) {
      console.warn('Could not extract filename from event logo URL:', imageUrl);
      return false;
    }

    const { error } = await supabase.storage
      .from('show-images')
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Event logo delete error:', error);
    return false;
  }
}

/**
 * Validate uploaded file
 * @param file - File to validate
 * @returns boolean - Is valid
 */
export function validateAvatarFile(file: Express.Multer.File): { isValid: boolean; error?: string } {
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 5MB limit' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' };
  }

  return { isValid: true };
}

// Placeholder authentication functions for backward compatibility
// These are simplified for the avatar migration - full auth system uses Supabase JWT
export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[auth] missing_or_malformed_authorization_header');
      }
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(' ')[1];
    
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Authentication timeout')), 10000)
    );
    
    // Validate JWT token with Supabase with timeout
    const { data: { user }, error } = await Promise.race([
      supabase.auth.getUser(token),
      timeoutPromise
    ]) as any;
    
    if (error || !user) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[auth] invalid_token_or_user_not_found', { error: error?.message });
      }
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Set user on request object
    req.user = {
      id: user.id,
      email: user.email || ''
    };
    
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] unexpected_error', { message: (error as any)?.message });
    }
    // Don't log full error details in production for security
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function validateUserAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Validate that the authenticated user can only access their own data
  const authenticatedUserId = req.user?.id;
  const requestedUserId = req.params.userId;
  
  if (!authenticatedUserId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (authenticatedUserId !== requestedUserId) {
    console.warn(`🚫 Authorization failed: User ${authenticatedUserId} attempted to access data for user ${requestedUserId}`);
    return res.status(403).json({ error: "You can only access your own data" });
  }
  
  next();
}

export function uploadFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Simple pass-through for now - file upload handled by multer
  next();
}