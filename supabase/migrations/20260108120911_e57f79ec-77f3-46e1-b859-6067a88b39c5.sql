-- Create gig_listings table
CREATE TABLE public.gig_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  venue_listing_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  gig_date DATE NOT NULL,
  openers JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gig_listings ENABLE ROW LEVEL SECURITY;

-- Artists can view gigs they're part of (as headliner or opener)
CREATE POLICY "Artists can view their gigs"
ON public.gig_listings
FOR SELECT
USING (
  auth.uid() = artist_id OR 
  auth.uid()::text IN (SELECT jsonb_array_elements_text(openers) FROM unnest(ARRAY[openers]) AS o WHERE openers ? 'artist_id')
);

-- Venues can view and manage their gigs
CREATE POLICY "Venues can view their gigs"
ON public.gig_listings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM venue_listings vl
    JOIN venue_profiles vp ON vl.venue_profile_id = vp.id
    WHERE vl.id = gig_listings.venue_listing_id AND vp.user_id = auth.uid()
  )
);

CREATE POLICY "Venues can insert gigs"
ON public.gig_listings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM venue_listings vl
    JOIN venue_profiles vp ON vl.venue_profile_id = vp.id
    WHERE vl.id = gig_listings.venue_listing_id AND vp.user_id = auth.uid()
  )
);

CREATE POLICY "Venues can update their gigs"
ON public.gig_listings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM venue_listings vl
    JOIN venue_profiles vp ON vl.venue_profile_id = vp.id
    WHERE vl.id = gig_listings.venue_listing_id AND vp.user_id = auth.uid()
  )
);

CREATE POLICY "Venues can delete their gigs"
ON public.gig_listings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM venue_listings vl
    JOIN venue_profiles vp ON vl.venue_profile_id = vp.id
    WHERE vl.id = gig_listings.venue_listing_id AND vp.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_gig_listings_updated_at
BEFORE UPDATE ON public.gig_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_gig_listings_gig_date ON public.gig_listings(gig_date);
CREATE INDEX idx_gig_listings_artist_id ON public.gig_listings(artist_id);
CREATE INDEX idx_gig_listings_venue_listing_id ON public.gig_listings(venue_listing_id);