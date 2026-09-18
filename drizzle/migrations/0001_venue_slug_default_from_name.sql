-- Shareable link should default to the venue's name (spaces -> dashes).
-- Profiles created at signup have no venue_name yet, so the trigger used the
-- 'venue-<8char>' fallback and never regenerated once a name was saved.
-- Regenerate whenever the slug is still that auto-fallback value.

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
  IF NEW.slug IS NULL OR NEW.slug = '' OR NEW.slug = fallback THEN
    NEW.slug := public.generate_venue_slug(NEW.venue_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: rows still carrying the fallback slug but with a name set.
UPDATE public.venue_profiles vp
SET slug = public.generate_venue_slug(vp.venue_name, vp.id)
WHERE vp.venue_name IS NOT NULL
  AND btrim(vp.venue_name) <> ''
  AND vp.slug = 'venue-' || substring(replace(vp.id::text, '-', '') from 1 for 8);