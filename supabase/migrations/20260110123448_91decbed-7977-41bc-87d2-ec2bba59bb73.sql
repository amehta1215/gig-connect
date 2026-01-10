-- Create a table for artist favorites
CREATE TABLE public.artist_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_listing_id UUID NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_id, venue_listing_id)
);

-- Enable Row Level Security
ALTER TABLE public.artist_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Artists can view their own favorites" 
ON public.artist_favorites 
FOR SELECT 
USING (auth.uid() = artist_id);

CREATE POLICY "Artists can add their own favorites" 
ON public.artist_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists can remove their own favorites" 
ON public.artist_favorites 
FOR DELETE 
USING (auth.uid() = artist_id);