# Booker / Promoter account type

## What the user gets
- A third sign-up option, **BOOKER / PROMOTER**, next to Artist, Venue and Both.
- The same dashboard as a venue (Applications, Inbox, Calendar, Profile), with these differences:
  - Profile page titled **PROFILE**; "Company Name" instead of "Venue Name"; new bio placeholder; an unchecked "Display booking company information to artists" checkbox under the bio.
  - No location, genres, photos or overall Preview Profile button on the main profile.
  - **VENUES** section instead of Rooms, with **Add Venue / Edit Venue**. The popup has all the room fields, plus a venue name, location, genres and venue photos. Each venue has its own Preview and Publish / Draft controls.
- Each published venue shows up as its own card in Find Venues, on both the public and signed-in pages, with its own detail page. When the checkbox is ticked, each venue page shows "Managed by [Company Name]" and the bio, if there is one. There is no public page for the company itself.
- Applications, inbox and calendar work exactly as they do for venues. Filters and labels say "Venue" instead of "Room", and bookings are grouped by venue.
- Nothing changes for Artist or Venue accounts.

## Structural changes needed (flagged before building)
1. **New account type in the database**: add `booker` to the `user_role` list. Sign-up, the login redirect, route protection, the role switcher, the welcome message and account deletion labels ("Deleted Booker") all have to recognise it.
2. **Reuse the venue tables instead of creating new ones**: the company is stored as a `venue_profiles` row, and each venue is a `venue_listings` row. Listings already hold name, location, genres and photos, so applications, holds, gigs, messages, favorites and permissions all keep working unchanged.
   - New column `venue_profiles.show_company_info` (off by default).
   - New column `venue_profiles.is_booker` (or read it from the profile role), so booker-specific behaviour can be switched on.
3. **Venue-name sync conflict**: a database rule currently copies the profile name onto every room. For bookers it must be skipped, or the company name would overwrite every venue's name.
4. **Discovery grouping**: Find Venues groups rooms under one venue card using profile photos. Booker listings need to show as separate cards using each listing's own photos, name and location. Venue cards stay as they are.
5. **Venue detail pages**: a booker venue opens a page built from that single listing, with an optional "Managed by" block. Profile slugs and shareable links are hidden for bookers because there is no company page. Per-venue links use the listing address.
6. **Dashboard routing**: bookers use the existing `/venue` pages with booker labels, so features don't have to be built twice. Profile completeness for bookers means a company name plus at least one published venue.

## Technical details
- Migration: `ALTER TYPE user_role ADD VALUE 'booker'`; add the new columns; update `handle_new_user` (create a venue_profiles row for booker), `sync_venue_name_to_listings` (skip bookers), `welcome_content` (booker copy), `prepare_account_deletion` labels. Add an RLS-safe public read of `show_company_info`, `venue_name` and `bio` for published booker listings. These are already public on venue_profiles.
- Frontend: `UserRole` type, AuthDialog role picker, ProtectedRoute (booker can access `requiredRole="venue"`), `useIsBooker()` helper, conditional copy in VenueProfile, VenueApplications filters, VenueCalendar and GigDetail, a listing-level preview reusing RoomPreviewSheet/VenueProfilePreviewContent, and FindVenues/PublicFindVenues splitting booker listings into individual cards via VenueCardGallery fed by listing photos.
- Add a small test for the visibility rule: company info is shown only when the checkbox is ticked.
