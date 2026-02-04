-- Add is_published column to venue_listings (defaults to true for existing listings)
ALTER TABLE public.venue_listings 
ADD COLUMN is_published boolean NOT NULL DEFAULT true;

-- Drop the existing "Anyone can view venue listings" policy
DROP POLICY IF EXISTS "Anyone can view venue listings" ON public.venue_listings;

-- Create new policy: Public can only view published listings
CREATE POLICY "Anyone can view published venue listings" 
ON public.venue_listings 
FOR SELECT 
USING (
  is_published = true 
  OR EXISTS (
    SELECT 1 FROM venue_profiles 
    WHERE venue_profiles.id = venue_listings.venue_profile_id 
    AND venue_profiles.user_id = auth.uid()
  )
);