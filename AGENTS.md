# Architecture rules

- Render the privacy policy from one Markdown string in a TypeScript module (Markdown file imports broke the build) through PrivacyPolicyContent on the legal page and signup dialog so both show the same formatted policy.
- Render Terms of Service from one Markdown string in a TypeScript module through TermsOfServiceContent on the legal page and signup dialog so the uploaded wording and formatting stay consistent without Markdown imports.
- Restrict deleted-account label reads to authenticated counterparties linked by messages, applications, or gigs; evaluate the relationship through existing row-level access checks to preserve shared history without exposing unrelated deleted users.

- Use the shared VenueCardGallery for discovery cards: existing Venue cards use profile photos and the legacy picture fallback; Booker venues use only their own listing photos, so unrelated venues and rooms never share galleries.
- Account deletion keeps shared records (messages, bookings) and replaces the deleted person with a saved label from deleted_accounts, so survivors keep their history without personal data; fetch other users via src/lib/accountParties instead of embedding profiles on messages/applications.
- Booker is a booking-account category using venue_profiles for the company and venue_listings for independent venues, with existing venue-dashboard routes and ownership rules; do not treat account categories as administrative privileges.
- Booker listing detail routes resolve one published venue listing, never the company profile; use the shared singleVenue presentation and ManagedBy visibility helper to keep discovery, previews and application details consistent.
- Derive venue_profiles.is_booker from its owner's account category in a database trigger and skip venue-name synchronization for bookers, so company edits cannot rename independently managed venues.
- Gate account sessions with document-memory-only explicit sign-in permission and clear saved sessions locally before rendering account pages; this prevents automatic login on a new visit while preserving in-visit navigation and deliberate verification/recovery links. Never embed demo login credentials or auto-sign-in routes.
- Load venue calendars with batched listing and counterparty lookups, and always finish loading with a retryable error state on failure; per-gig lookups multiply requests for multi-venue accounts.

- Keep authentication emails on the managed SDK handler and its scaffolded templates; managed delivery does not use application email queues.
