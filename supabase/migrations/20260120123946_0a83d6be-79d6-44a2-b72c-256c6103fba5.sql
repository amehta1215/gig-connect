-- Add columns for manual event venue name and location (for artist-created events)
ALTER TABLE public.gig_listings 
ADD COLUMN manual_venue_name text,
ADD COLUMN manual_location text;