DROP POLICY IF EXISTS "Anyone can view artist media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view venue media" ON storage.objects;
CREATE POLICY "Owners can list their artist media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'artist-media' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "Owners can list their venue media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'venue-media' AND (storage.foldername(name))[1] = (select auth.uid()::text));