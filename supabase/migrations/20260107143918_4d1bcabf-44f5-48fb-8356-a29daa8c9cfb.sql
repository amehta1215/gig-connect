-- Add availability preference to applications
CREATE TYPE public.availability_preference AS ENUM ('date_range', 'specific_dates', 'flexible');

ALTER TABLE public.applications
ADD COLUMN availability_preference public.availability_preference DEFAULT 'flexible';