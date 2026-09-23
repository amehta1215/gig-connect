ALTER TABLE public.venue_profiles
  ADD COLUMN IF NOT EXISTS slug_is_custom boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_venue_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback text;
BEGIN
  fallback := 'venue-' || substring(replace(NEW.id::text, '-', '') from 1 for 8);

  -- A venue's own choice always wins
  IF TG_OP = 'UPDATE' AND NEW.slug IS DISTINCT FROM OLD.slug
     AND NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  IF NEW.slug_is_custom THEN
    RETURN NEW;
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' OR NEW.slug = fallback
     OR (TG_OP = 'UPDATE' AND NEW.venue_name IS DISTINCT FROM OLD.venue_name) THEN
    NEW.slug := public.generate_venue_slug(NEW.venue_name, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_venue_slug() FROM anon, authenticated, public;

-- Bring existing non-custom links in line with current venue names
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, venue_name, slug FROM public.venue_profiles WHERE slug_is_custom = false LOOP
    UPDATE public.venue_profiles
       SET slug = public.generate_venue_slug(r.venue_name, r.id)
     WHERE id = r.id;
  END LOOP;
END $$;