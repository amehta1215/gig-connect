-- Add date fields to applications for availability
ALTER TABLE public.applications
ADD COLUMN availability_start_date date,
ADD COLUMN availability_end_date date,
ADD COLUMN availability_specific_dates date[];