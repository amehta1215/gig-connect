
CREATE TABLE public.deleted_accounts (
  id uuid PRIMARY KEY,
  role text NOT NULL,
  display_label text NOT NULL DEFAULT 'Deleted User',
  deleted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deleted_accounts TO authenticated;
GRANT ALL ON public.deleted_accounts TO service_role;
ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read deleted account labels" ON public.deleted_accounts FOR SELECT TO authenticated USING (true);

CREATE TABLE public.storage_deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  buckets text[] NOT NULL DEFAULT ARRAY['artist-media','venue-media'],
  extra_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.storage_deletion_jobs TO service_role;
ALTER TABLE public.storage_deletion_jobs ENABLE ROW LEVEL SECURITY;

-- Stop cascading deletes from accounts into shared records
ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT messages_receiver_id_fkey;
ALTER TABLE public.applications DROP CONSTRAINT applications_artist_id_fkey;
ALTER TABLE public.applications DROP CONSTRAINT applications_venue_listing_id_fkey;
ALTER TABLE public.gig_listings DROP CONSTRAINT gig_listings_application_id_fkey;
ALTER TABLE public.gig_listings ADD CONSTRAINT gig_listings_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages(receiver_id);

ALTER TABLE public.applications
  ADD COLUMN artist_display_name text, ADD COLUMN venue_display_name text, ADD COLUMN room_display_name text,
  ADD COLUMN artist_deleted_at timestamptz, ADD COLUMN venue_deleted_at timestamptz;
ALTER TABLE public.gig_listings
  ADD COLUMN artist_display_name text, ADD COLUMN venue_display_name text, ADD COLUMN room_display_name text,
  ADD COLUMN artist_deleted_at timestamptz, ADD COLUMN venue_deleted_at timestamptz;

-- Called by the server right before the login is removed
CREATE OR REPLACE FUNCTION public.prepare_account_deletion(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text; v_band text; v_venue text; v_label text;
BEGIN
  SELECT role::text INTO v_role FROM profiles WHERE id = _uid;
  SELECT NULLIF(btrim(band_name),'') INTO v_band FROM artist_profiles WHERE user_id = _uid LIMIT 1;
  SELECT NULLIF(btrim(venue_name),'') INTO v_venue FROM venue_profiles WHERE user_id = _uid LIMIT 1;
  v_label := CASE
    WHEN v_role = 'venue' THEN COALESCE(v_venue || ': Deleted Venue', 'Deleted Venue')
    WHEN v_role = 'artist' THEN COALESCE(v_band || ': Deleted Artist', 'Deleted Artist')
    ELSE COALESCE(v_venue || ': Deleted Venue', v_band || ': Deleted Artist', 'Deleted User') END;

  INSERT INTO deleted_accounts(id, role, display_label) VALUES (_uid, COALESCE(v_role,'artist'), v_label)
  ON CONFLICT (id) DO UPDATE SET display_label = EXCLUDED.display_label;

  -- As artist
  UPDATE applications SET artist_deleted_at = now(),
    artist_display_name = COALESCE(v_band, 'Deleted Artist') || CASE WHEN v_band IS NULL THEN '' ELSE ': Deleted Artist' END
  WHERE artist_id = _uid;
  UPDATE gig_listings SET artist_deleted_at = now(),
    artist_display_name = COALESCE(v_band, 'Deleted Artist') || CASE WHEN v_band IS NULL THEN '' ELSE ': Deleted Artist' END
  WHERE artist_id = _uid;

  -- As venue: snapshot venue + room names on records that survive
  UPDATE applications a SET venue_deleted_at = now(),
    venue_display_name = COALESCE(NULLIF(btrim(vl.venue_name),''), 'Deleted Venue') || ': Deleted Venue',
    room_display_name = vl.room_name
  FROM venue_listings vl JOIN venue_profiles vp ON vp.id = vl.venue_profile_id
  WHERE a.venue_listing_id = vl.id AND vp.user_id = _uid;
  UPDATE gig_listings g SET venue_deleted_at = now(),
    venue_display_name = COALESCE(NULLIF(btrim(g.manual_venue_name),''), NULLIF(btrim(vl.venue_name),''), 'Deleted Venue') || ': Deleted Venue',
    room_display_name = vl.room_name,
    manual_location = COALESCE(g.manual_location, vl.location)
  FROM venue_listings vl JOIN venue_profiles vp ON vp.id = vl.venue_profile_id
  WHERE g.venue_listing_id = vl.id AND vp.user_id = _uid;

  -- Venue's own manual events with no artist on the platform stay only with the venue; they go with it.
  -- Artist-side gigs that the venue owned stay because artist_id is the survivor.
  DELETE FROM gig_listings g USING venue_listings vl, venue_profiles vp
  WHERE g.venue_listing_id = vl.id AND vl.venue_profile_id = vp.id AND vp.user_id = _uid
    AND g.application_id IS NULL AND g.artist_id = _uid;

  -- Artist's own manual events go with the artist
  DELETE FROM gig_listings WHERE artist_id = _uid AND application_id IS NULL
    AND venue_listing_id NOT IN (SELECT vl.id FROM venue_listings vl JOIN venue_profiles vp ON vp.id=vl.venue_profile_id WHERE vp.user_id <> _uid);

  -- Personal-only records
  DELETE FROM venue_application_favorites WHERE venue_user_id = _uid;
  DELETE FROM artist_favorites WHERE artist_id = _uid;

  INSERT INTO storage_deletion_jobs(user_id) VALUES (_uid);
END; $$;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;

-- Guards
CREATE OR REPLACE FUNCTION public.block_deleted_account_bookings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'applications' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'accepted'
       AND (NEW.artist_deleted_at IS NOT NULL OR NEW.venue_deleted_at IS NOT NULL) THEN
      RAISE EXCEPTION 'This account has been deleted, so the request cannot be accepted.';
    END IF;
  ELSIF TG_TABLE_NAME = 'gig_listings' THEN
    IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM deleted_accounts WHERE id = NEW.artist_id) THEN
      RAISE EXCEPTION 'This artist account has been deleted.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER block_deleted_application_accept BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.block_deleted_account_bookings();
CREATE TRIGGER block_deleted_gig_insert BEFORE INSERT ON public.gig_listings FOR EACH ROW EXECUTE FUNCTION public.block_deleted_account_bookings();

CREATE OR REPLACE FUNCTION public.block_messages_to_deleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM deleted_accounts WHERE id IN (NEW.receiver_id, NEW.sender_id)) THEN
    RAISE EXCEPTION 'This account has been deleted and can no longer receive messages.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER block_messages_to_deleted BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.block_messages_to_deleted();

-- Allow the server (no signed-in user) to clear attachments during retention cleanup
CREATE OR REPLACE FUNCTION public.enforce_message_immutability()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.attachments IS DISTINCT FROM OLD.attachments
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.thread_id IS DISTINCT FROM OLD.thread_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Messages are a permanent record and cannot be edited after sending.';
  END IF;
  IF auth.uid() = OLD.sender_id AND auth.uid() IS DISTINCT FROM OLD.receiver_id THEN
    IF NEW.is_read IS DISTINCT FROM OLD.is_read
       OR NEW.is_starred IS DISTINCT FROM OLD.is_starred
       OR NEW.deleted_by_receiver IS DISTINCT FROM OLD.deleted_by_receiver THEN
      RAISE EXCEPTION 'Senders can only update their own delete state.';
    END IF;
  END IF;
  IF auth.uid() = OLD.receiver_id AND auth.uid() IS DISTINCT FROM OLD.sender_id THEN
    IF NEW.deleted_by_sender IS DISTINCT FROM OLD.deleted_by_sender THEN
      RAISE EXCEPTION 'Receivers cannot update the sender delete state.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Retention cleanup (database side). Returns attachment paths whose files the server must remove.
CREATE OR REPLACE FUNCTION public.run_retention_cleanup()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paths jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(a), '[]'::jsonb) INTO v_paths
  FROM messages m, jsonb_array_elements(COALESCE(m.attachments,'[]'::jsonb)) a
  JOIN LATERAL (SELECT 1) x ON true
  WHERE EXISTS (SELECT 1 FROM deleted_accounts d WHERE d.id IN (m.sender_id, m.receiver_id) AND d.deleted_at < now() - interval '1 year');

  UPDATE messages m SET attachments = '[]'::jsonb
  WHERE jsonb_array_length(COALESCE(m.attachments,'[]'::jsonb)) > 0
    AND EXISTS (SELECT 1 FROM deleted_accounts d WHERE d.id IN (m.sender_id, m.receiver_id) AND d.deleted_at < now() - interval '1 year');

  DELETE FROM messages m WHERE EXISTS (SELECT 1 FROM deleted_accounts d WHERE d.id IN (m.sender_id, m.receiver_id) AND d.deleted_at < now() - interval '2 years');

  DELETE FROM gig_listings WHERE COALESCE(artist_deleted_at, venue_deleted_at) < now() - interval '7 years';
  DELETE FROM applications WHERE status = 'in_progress' AND COALESCE(artist_deleted_at, venue_deleted_at) < now() - interval '90 days';
  DELETE FROM applications a WHERE COALESCE(a.artist_deleted_at, a.venue_deleted_at) < now() - interval '7 years'
    AND NOT EXISTS (SELECT 1 FROM gig_listings g WHERE g.application_id = a.id);

  RETURN v_paths;
END; $$;
REVOKE ALL ON FUNCTION public.run_retention_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_retention_cleanup() TO service_role;
