ALTER TABLE public.venue_profiles ADD COLUMN show_company_info boolean NOT NULL DEFAULT false;
ALTER TABLE public.venue_profiles ADD COLUMN is_booker boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_venue_account_kind() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT COALESCE(p.role::text = 'booker', false) INTO NEW.is_booker FROM public.profiles p WHERE p.id = NEW.user_id;
  NEW.is_booker := COALESCE(NEW.is_booker, false);
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Profile ownership cannot be changed.'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.set_venue_account_kind() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER set_venue_account_kind BEFORE INSERT OR UPDATE ON public.venue_profiles FOR EACH ROW EXECUTE FUNCTION public.set_venue_account_kind();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role, terms_accepted_at) VALUES (
    NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''), COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''), NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'artist'), (NEW.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz);
  IF (NEW.raw_user_meta_data ->> 'role') IN ('artist', 'both') THEN INSERT INTO public.artist_profiles (user_id) VALUES (NEW.id); END IF;
  IF (NEW.raw_user_meta_data ->> 'role') IN ('venue', 'both', 'booker') THEN INSERT INTO public.venue_profiles (user_id) VALUES (NEW.id); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_venue_name_to_listings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.is_booker AND NEW.venue_name IS NOT NULL AND NEW.venue_name IS DISTINCT FROM OLD.venue_name THEN
    UPDATE public.venue_listings SET venue_name = NEW.venue_name, updated_at = now() WHERE venue_profile_id = NEW.id AND venue_name IS DISTINCT FROM NEW.venue_name;
  END IF;
  RETURN NEW;
END; $$;

ALTER FUNCTION public.welcome_content(uuid, public.user_role) RENAME TO welcome_content_existing_accounts;
REVOKE ALL ON FUNCTION public.welcome_content_existing_accounts(uuid, public.user_role) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.welcome_content(p_user_id uuid, p_role public.user_role) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF p_role::text <> 'booker' THEN RETURN public.welcome_content_existing_accounts(p_user_id, p_role); END IF;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = p_user_id;
  RETURN 'Hi ' || COALESCE(NULLIF(btrim(v_name), ''), 'there') || E',\n\nWelcome to Set Hound, a platform built to connect artists with live music opportunities.\n\nGetting Started:\n\n• Create Your Profile: Add your company name and optionally your bio. Choose whether to display your company information to artists.\n• Add Venues: Create a listing for each venue you book. Add its location, genres, photos and details, then publish it so artists can find it.\n• Review Applications: Review artists applying to each of your venues in Applications.\n• Book Your Shows: Accept applications, manage holds and confirmed gigs in your Calendar, and coordinate details through Messages.\n\nBest,\nThe Set Hound Team';
END; $$;
REVOKE ALL ON FUNCTION public.welcome_content(uuid, public.user_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.welcome_content(uuid, public.user_role) TO service_role;

ALTER FUNCTION public.prepare_account_deletion(uuid) RENAME TO prepare_account_deletion_existing_accounts;
REVOKE ALL ON FUNCTION public.prepare_account_deletion_existing_accounts(uuid) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.prepare_account_deletion(_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_booker boolean; v_company text;
BEGIN
  SELECT role::text = 'booker' INTO v_is_booker FROM public.profiles WHERE id = _uid;
  SELECT NULLIF(btrim(venue_name), '') INTO v_company FROM public.venue_profiles WHERE user_id = _uid LIMIT 1;
  PERFORM public.prepare_account_deletion_existing_accounts(_uid);
  IF v_is_booker THEN
    UPDATE public.deleted_accounts SET display_label = COALESCE(v_company || ': Deleted Booker', 'Deleted Booker') WHERE id = _uid;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;