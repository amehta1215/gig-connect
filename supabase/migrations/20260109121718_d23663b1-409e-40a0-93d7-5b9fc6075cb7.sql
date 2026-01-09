-- Add show_time column to gig_listings table
ALTER TABLE public.gig_listings
ADD COLUMN show_time time without time zone;