CREATE OR REPLACE FUNCTION public.sync_venue_name_to_listings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.venue_name IS NOT NULL AND NEW.venue_name IS DISTINCT FROM OLD.venue_name THEN
    UPDATE public.venue_listings
    SET venue_name = NEW.venue_name, updated_at = now()
    WHERE venue_profile_id = NEW.id
      AND venue_name IS DISTINCT FROM NEW.venue_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_venue_name_to_listings_trg ON public.venue_profiles;
CREATE TRIGGER sync_venue_name_to_listings_trg
AFTER UPDATE OF venue_name ON public.venue_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_venue_name_to_listings();

UPDATE public.venue_listings vl
SET venue_name = vp.venue_name, updated_at = now()
FROM public.venue_profiles vp
WHERE vl.venue_profile_id = vp.id
  AND vp.venue_name IS NOT NULL
  AND vl.venue_name IS DISTINCT FROM vp.venue_name;