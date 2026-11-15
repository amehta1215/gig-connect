-- Pre-launch security fixes.

-- 1. Welcome-message helpers are only for the signup trigger, never for direct API calls.
--    (Open to PUBLIC by default, which let anyone spam any user from the system account.)
REVOKE EXECUTE ON FUNCTION public.send_welcome_message(uuid, public.user_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.welcome_content(uuid, public.user_role) FROM PUBLIC, anon, authenticated;

-- 2. Gigs: artist-created personal events no longer borrow a random venue's room.
--    Previously they were attached to whichever venue listing came back first,
--    so they appeared on that venue's calendar.
ALTER TABLE public.gig_listings ALTER COLUMN venue_listing_id DROP NOT NULL;

UPDATE public.gig_listings g
SET venue_listing_id = NULL
WHERE g.application_id IS NULL
  AND g.manual_venue_name IS NOT NULL
  AND g.manual_artist_name IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_listings vl
    JOIN public.venue_profiles vp ON vp.id = vl.venue_profile_id
    WHERE vl.id = g.venue_listing_id AND vp.user_id = g.artist_id
  );

-- Artists may only create personal events (not tied to a venue room or application).
DROP POLICY IF EXISTS "Artists can insert their own gigs" ON public.gig_listings;
CREATE POLICY "Artists can insert their own gigs"
ON public.gig_listings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = artist_id
  AND venue_listing_id IS NULL
  AND application_id IS NULL
);

-- On venue bookings, artists can edit their own details (notes, openers, date)
-- but cannot reassign the gig or change hold/confirmed status.
CREATE OR REPLACE FUNCTION public.enforce_gig_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_venue_owner boolean := false;
BEGIN
  IF OLD.venue_listing_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.venue_listings vl
      JOIN public.venue_profiles vp ON vp.id = vl.venue_profile_id
      WHERE vl.id = OLD.venue_listing_id AND vp.user_id = auth.uid()
    ) INTO v_is_venue_owner;
  END IF;

  IF auth.uid() IS NULL OR v_is_venue_owner THEN
    RETURN NEW;
  END IF;

  IF NEW.venue_listing_id IS DISTINCT FROM OLD.venue_listing_id
     OR NEW.application_id IS DISTINCT FROM OLD.application_id
     OR NEW.artist_id IS DISTINCT FROM OLD.artist_id THEN
    RAISE EXCEPTION 'This gig cannot be moved to another venue, application or artist.';
  END IF;

  IF OLD.venue_listing_id IS NOT NULL AND (
       NEW.is_confirmed IS DISTINCT FROM OLD.is_confirmed
       OR NEW.hold_priority IS DISTINCT FROM OLD.hold_priority) THEN
    RAISE EXCEPTION 'Only the venue can confirm or reorder holds.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_gig_update_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_gig_update_rules ON public.gig_listings;
CREATE TRIGGER enforce_gig_update_rules
BEFORE UPDATE ON public.gig_listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_gig_update_rules();

-- 3. Applications always start "in progress"; only the venue can accept later.
CREATE OR REPLACE FUNCTION public.enforce_application_insert_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.status := 'in_progress';
    NEW.is_read := false;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_application_insert_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_application_insert_rules ON public.applications;
CREATE TRIGGER enforce_application_insert_rules
BEFORE INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_insert_rules();

-- 4. Message attachments: private bucket, so files are only reachable through
--    short-lived signed links for the sender and receiver (the app already uses these).
UPDATE storage.buckets SET public = false WHERE id = 'message-attachments';
