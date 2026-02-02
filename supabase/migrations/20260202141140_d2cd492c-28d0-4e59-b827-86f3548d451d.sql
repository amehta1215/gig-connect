-- Add columns to gig_listings for hold management
ALTER TABLE public.gig_listings 
ADD COLUMN is_confirmed boolean NOT NULL DEFAULT true,
ADD COLUMN hold_priority integer NULL;

-- Add index for efficient querying of holds
CREATE INDEX idx_gig_listings_date_confirmed ON public.gig_listings(gig_date, is_confirmed);

-- Comment for clarity
COMMENT ON COLUMN public.gig_listings.is_confirmed IS 'True if gig is confirmed, false if it is a hold';
COMMENT ON COLUMN public.gig_listings.hold_priority IS 'Priority ranking for holds (1st, 2nd, 3rd, etc). NULL for confirmed gigs';