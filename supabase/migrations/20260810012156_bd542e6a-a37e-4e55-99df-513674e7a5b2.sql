-- 1. APPLICATIONS: split update rules + column-level enforcement

DROP POLICY IF EXISTS "Relevant parties can update applications" ON public.applications;

CREATE POLICY "Artists can update their own applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (auth.uid() = artist_id)
WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Venues can update applications to their listings"
ON public.applications
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.venue_listings vl
  JOIN public.venue_profiles vp ON vl.venue_profile_id = vp.id
  WHERE vl.id = applications.venue_listing_id AND vp.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.venue_listings vl
  JOIN public.venue_profiles vp ON vl.venue_profile_id = vp.id
  WHERE vl.id = applications.venue_listing_id AND vp.user_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.enforce_application_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_venue_owner boolean;
BEGIN
  -- Ownership columns are immutable for everyone
  IF NEW.artist_id IS DISTINCT FROM OLD.artist_id
     OR NEW.venue_listing_id IS DISTINCT FROM OLD.venue_listing_id THEN
    RAISE EXCEPTION 'Application ownership cannot be changed.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT EXISTS (
      SELECT 1 FROM public.venue_listings vl
      JOIN public.venue_profiles vp ON vl.venue_profile_id = vp.id
      WHERE vl.id = OLD.venue_listing_id AND vp.user_id = auth.uid()
    ) INTO v_is_venue_owner;

    IF NOT COALESCE(v_is_venue_owner, false) THEN
      RAISE EXCEPTION 'Only the venue can change an application status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_application_update_rules ON public.applications;
CREATE TRIGGER enforce_application_update_rules
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_update_rules();

-- 2. MESSAGES: immutable content after send

CREATE OR REPLACE FUNCTION public.enforce_message_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.attachments IS DISTINCT FROM OLD.attachments
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.thread_id IS DISTINCT FROM OLD.thread_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Messages are a permanent record and cannot be edited after sending.';
  END IF;

  -- Sender may only toggle their own delete flag
  IF auth.uid() = OLD.sender_id AND auth.uid() IS DISTINCT FROM OLD.receiver_id THEN
    IF NEW.is_read IS DISTINCT FROM OLD.is_read
       OR NEW.is_starred IS DISTINCT FROM OLD.is_starred
       OR NEW.deleted_by_receiver IS DISTINCT FROM OLD.deleted_by_receiver THEN
      RAISE EXCEPTION 'Senders can only update their own delete state.';
    END IF;
  END IF;

  -- Receiver may only toggle read / starred / their own delete flag
  IF auth.uid() = OLD.receiver_id AND auth.uid() IS DISTINCT FROM OLD.sender_id THEN
    IF NEW.deleted_by_sender IS DISTINCT FROM OLD.deleted_by_sender THEN
      RAISE EXCEPTION 'Receivers cannot update the sender delete state.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_message_immutability ON public.messages;
CREATE TRIGGER enforce_message_immutability
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_immutability();

-- 3. MESSAGES: 100 messages per hour per sender

CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.messages
  WHERE sender_id = auth.uid()
    AND created_at > now() - interval '1 hour';

  IF v_count >= 100 THEN
    RAISE EXCEPTION 'Message rate limit exceeded. You can send up to 100 messages per hour.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_message_rate_limit ON public.messages;
CREATE TRIGGER enforce_message_rate_limit
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_rate_limit();

-- 4. STORAGE: folder ownership on message attachments

DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;

CREATE POLICY "Users can upload their own message attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);