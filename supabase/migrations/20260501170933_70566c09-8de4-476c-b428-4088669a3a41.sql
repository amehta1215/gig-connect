
-- Trigger to keep applications.updated_at fresh on any change
DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: for accepted applications, use the latest related gig_listing timestamp
UPDATE public.applications a
SET updated_at = GREATEST(
  a.updated_at,
  COALESCE((
    SELECT MAX(GREATEST(g.created_at, g.updated_at))
    FROM public.gig_listings g
    WHERE g.application_id = a.id
  ), a.updated_at)
)
WHERE a.status = 'accepted';
