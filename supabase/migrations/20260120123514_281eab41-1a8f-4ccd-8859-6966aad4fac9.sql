-- Add RLS policy to allow artists to insert their own gigs
CREATE POLICY "Artists can insert their own gigs" 
ON public.gig_listings 
FOR INSERT 
WITH CHECK (auth.uid() = artist_id);

-- Add RLS policy to allow artists to update their own gigs
CREATE POLICY "Artists can update their own gigs" 
ON public.gig_listings 
FOR UPDATE 
USING (auth.uid() = artist_id);

-- Add RLS policy to allow artists to delete their own gigs
CREATE POLICY "Artists can delete their own gigs" 
ON public.gig_listings 
FOR DELETE 
USING (auth.uid() = artist_id);