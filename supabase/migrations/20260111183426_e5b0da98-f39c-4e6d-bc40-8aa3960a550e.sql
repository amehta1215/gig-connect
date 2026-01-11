-- Add picture column to venue_profiles for general venue photo
ALTER TABLE public.venue_profiles 
ADD COLUMN picture text;