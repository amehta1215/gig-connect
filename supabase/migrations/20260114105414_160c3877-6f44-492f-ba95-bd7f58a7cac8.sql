-- Create table for venue application favorites
CREATE TABLE public.venue_application_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venue_user_id, application_id)
);

-- Enable Row Level Security
ALTER TABLE public.venue_application_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for venue user access
CREATE POLICY "Users can view their own favorites"
ON public.venue_application_favorites
FOR SELECT
USING (auth.uid() = venue_user_id);

CREATE POLICY "Users can create their own favorites"
ON public.venue_application_favorites
FOR INSERT
WITH CHECK (auth.uid() = venue_user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.venue_application_favorites
FOR DELETE
USING (auth.uid() = venue_user_id);