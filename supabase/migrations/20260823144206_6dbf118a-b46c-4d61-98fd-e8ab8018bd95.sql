DROP POLICY IF EXISTS "Venues can delete applications to their listings" ON public.applications;
CREATE POLICY "Venues can delete applications to their listings" ON public.applications
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM venue_listings vl
    JOIN venue_profiles vp ON vl.venue_profile_id = vp.id
    WHERE vl.id = applications.venue_listing_id AND vp.user_id = auth.uid()
  ));