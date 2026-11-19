CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer IS NOT NULL AND _viewer = auth.uid() AND (
    _viewer = _target
    OR EXISTS (SELECT 1 FROM public.messages m WHERE (m.sender_id = _viewer AND m.receiver_id = _target) OR (m.sender_id = _target AND m.receiver_id = _viewer))
    OR EXISTS (SELECT 1 FROM public.applications a JOIN public.venue_listings vl ON vl.id = a.venue_listing_id JOIN public.venue_profiles vp ON vp.id = vl.venue_profile_id
               WHERE (a.artist_id = _target AND vp.user_id = _viewer) OR (a.artist_id = _viewer AND vp.user_id = _target))
    OR EXISTS (SELECT 1 FROM public.gig_listings g JOIN public.venue_listings vl ON vl.id = g.venue_listing_id JOIN public.venue_profiles vp ON vp.id = vl.venue_profile_id
               WHERE (g.artist_id = _target AND vp.user_id = _viewer) OR (g.artist_id = _viewer AND vp.user_id = _target))
  )
$$;