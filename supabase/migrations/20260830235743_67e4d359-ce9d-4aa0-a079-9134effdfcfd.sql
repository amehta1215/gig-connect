ALTER TABLE public.venue_profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_venue_profiles_slug ON public.venue_profiles(slug);

CREATE OR REPLACE FUNCTION public.generate_venue_slug(_name text, _id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n integer := 1;
BEGIN
  base := lower(coalesce(_name, ''));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  IF base = '' OR length(base) < 3 THEN
    base := 'venue-' || substring(replace(_id::text, '-', '') from 1 for 8);
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.venue_profiles WHERE slug = candidate AND id <> _id) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_venue_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_venue_slug(NEW.venue_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_venue_slug_trigger ON public.venue_profiles;
CREATE TRIGGER set_venue_slug_trigger
BEFORE INSERT OR UPDATE ON public.venue_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_venue_slug();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, venue_name FROM public.venue_profiles WHERE slug IS NULL OR slug = '' LOOP
    UPDATE public.venue_profiles SET slug = public.generate_venue_slug(r.venue_name, r.id) WHERE id = r.id;
  END LOOP;
END $$;