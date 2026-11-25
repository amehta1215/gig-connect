CREATE INDEX IF NOT EXISTS idx_applications_artist_id ON public.applications(artist_id);
CREATE INDEX IF NOT EXISTS idx_applications_venue_listing_id ON public.applications(venue_listing_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_gig_listings_application_id ON public.gig_listings(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_venue_listings_venue_profile_id ON public.venue_listings(venue_profile_id);
CREATE INDEX IF NOT EXISTS idx_venue_listings_published ON public.venue_listings(is_published);
CREATE INDEX IF NOT EXISTS idx_artist_favorites_listing ON public.artist_favorites(venue_listing_id);
CREATE INDEX IF NOT EXISTS idx_venue_app_fav_application ON public.venue_application_favorites(application_id);