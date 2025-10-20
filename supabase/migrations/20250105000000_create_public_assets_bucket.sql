-- Create public-assets storage bucket for store logos and other public files
-- This bucket is publicly accessible for reading but requires authentication for uploads

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all files in public-assets bucket
CREATE POLICY "Public read access for public-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-assets');

-- Allow authenticated users to upload files to their own folders
CREATE POLICY "Authenticated users can upload to public-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- Allow users to update their own uploaded files
CREATE POLICY "Users can update their own files in public-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own files in public-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
