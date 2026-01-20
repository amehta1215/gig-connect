-- Add manual_artist_name column for venue-created manual events
ALTER TABLE public.gig_listings 
ADD COLUMN manual_artist_name text;