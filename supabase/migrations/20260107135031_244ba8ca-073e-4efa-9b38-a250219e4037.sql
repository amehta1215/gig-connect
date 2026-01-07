-- Create storage bucket for artist media
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-media', 'artist-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own artist media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'artist-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view artist media (public bucket)
CREATE POLICY "Anyone can view artist media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'artist-media');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own artist media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'artist-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);