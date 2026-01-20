-- Allow artists to delete (withdraw) their own applications
CREATE POLICY "Artists can delete their own applications"
ON public.applications
FOR DELETE
USING (auth.uid() = artist_id);