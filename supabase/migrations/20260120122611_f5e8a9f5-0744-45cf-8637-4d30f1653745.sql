-- Make application_id nullable to allow manual event creation
ALTER TABLE public.gig_listings 
ALTER COLUMN application_id DROP NOT NULL;