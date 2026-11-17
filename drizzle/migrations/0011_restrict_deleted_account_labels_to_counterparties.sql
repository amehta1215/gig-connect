ALTER POLICY "Signed-in users can read deleted account labels"
ON public.deleted_accounts
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = auth.uid() AND m.receiver_id = deleted_accounts.id)
         OR (m.receiver_id = auth.uid() AND m.sender_id = deleted_accounts.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.venue_listings vl ON vl.id = a.venue_listing_id
      JOIN public.venue_profiles vp ON vp.id = vl.venue_profile_id
      WHERE (a.artist_id = deleted_accounts.id AND vp.user_id = auth.uid())
         OR (a.artist_id = auth.uid() AND vp.user_id = deleted_accounts.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.gig_listings g
      JOIN public.venue_listings vl ON vl.id = g.venue_listing_id
      JOIN public.venue_profiles vp ON vp.id = vl.venue_profile_id
      WHERE (g.artist_id = deleted_accounts.id AND vp.user_id = auth.uid())
         OR (g.artist_id = auth.uid() AND vp.user_id = deleted_accounts.id)
    )
  )
);