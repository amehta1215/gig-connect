REVOKE ALL ON FUNCTION public.generate_venue_slug(text, uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.set_venue_slug() FROM anon, authenticated, public;