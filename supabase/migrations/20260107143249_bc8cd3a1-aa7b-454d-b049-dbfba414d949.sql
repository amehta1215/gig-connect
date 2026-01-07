-- Create storage bucket for venue media
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-media', 'venue-media', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload venue media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'venue-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Anyone can view venue media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'venue-media');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own venue media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'venue-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);