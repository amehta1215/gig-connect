# Account deletion and data retention overhaul

## What happens today (inspected, nothing changed)
- Deleting an account removes the login, then the database chains the deletion through everything linked to it: profile, artist/venue profile, rooms, **all messages (both sides)**, **all booking requests**, and **every hold/confirmed booking created from a request**. This breaks requirements 3, 5 and 6.
- Calendar events added by hand are kept, but still point at the deleted person or room (broken references).
- Uploaded photos and attachments are never deleted. Artist/venue photos are public, so old links keep working.
- Good news: every upload is already saved in a folder named after the uploader's account, so ownership of files can be tracked reliably without guessing.
- The password + 6-digit email code steps work and will stay exactly as they are.

## Proposed behaviour after deletion

| Data | New behaviour |
|---|---|
| Login, email, password | Permanently deleted. Email can sign up again as a brand-new account. |
| Name, email copy, artist/venue profile, bio, links | Deleted. |
| Profile photos (artist + venue + room photos) | Files deleted from storage; links stop working (after short caching). |
| Messages | Kept for the other person. Deleted side shows **"Band/Venue Name: Deleted Artist/Venue"** (or "Deleted User" if no name was set), no profile link, no replies possible. |
| Attachments the deleted user sent/received in kept conversations | Kept privately for the other person only; deleted user can never open them. |
| Confirmed bookings and holds | Kept with original date, time, status, notes, openers. Shown as **"Band Name: Deleted Artist"** / **"Venue Name: Deleted Venue"**. Never cancelled automatically. |
| Pending booking requests | Kept for the venue, marked "Account deleted"; cannot be accepted or confirmed. |
| Manual calendar events of the survivor | Kept, untouched; links to deleted people/rooms cleared, a saved name label shown instead. |
| Favorites, likes | Deleted. |

A new account with the same email gets a new internal ID, so nothing old reconnects to it.

## How it works (technical)

**Tombstone records.** Instead of the old person disappearing, their records are re-pointed to a small "deleted account" placeholder that holds no personal data (only an ID, role and deletion date). This keeps conversations and bookings intact without keeping names or emails.

1. New table `deleted_accounts(id, role, deleted_at)` — no names/emails.
2. Change link rules (additive, no data loss):
   - messages sender/receiver: stop chaining deletion; on deletion, re-point to the placeholder.
   - applications.artist_id, gig_listings.application_id, venue_listing_id: stop cascading; keep rows.
   - Add saved display fields on bookings/requests (`artist_display_name`, `venue_display_name`, `room_display_name`) filled at deletion time with the band/venue/room name followed by a colon and the deletion label, e.g. "The Parlor: Deleted Venue" or "Night Owls: Deleted Artist". The person's real first/last name and email are not kept.
   - Add `artist_deleted_at` / `venue_deleted_at` flags on applications and gig listings.
3. Venue deletion: rooms are hidden (unpublished, details stripped) rather than erased while any booking still refers to them, so the artist keeps their booking history. Removed fully once no bookings refer to them.
4. Database guard: a pending request from a deleted account cannot change to HOLD/CONFIRMED; messages cannot be sent to a deleted account.
5. Profile visibility rules updated so a deleted user's profile can't be opened.

**Deletion process (server step, same verification first).**
1. Write a "deletion job" record listing the user's storage folders.
2. In one database transaction: anonymise and re-point messages/bookings, delete personal rows, delete the login.
3. Immediately make the user's photo files unreachable (delete them); attachments the user sent in kept conversations are moved under the placeholder's ownership so only the surviving participant can read them.
4. Mark the job done. If any file deletion fails, the job stays "pending" with the error.

**Retries and detection.** A scheduled task every hour retries pending storage jobs (up to e.g. 10 attempts), then flags them in a small admin-visible table. Because the database part commits first and files are deleted by owner folder, a storage failure never corrupts bookings — at worst a file lingers until retry succeeds.

**Private attachments.** Already private with one-hour links; access will check that the viewer is a current participant in that conversation and not deleted.

## Retention (proposed defaults — Decision B)
- Messages in conversations with a deleted user: kept **2 years**, then deleted.
- Attachments in those conversations: kept **1 year**, then deleted.
- Confirmed booking records: kept **7 years** (tax/contract evidence), anonymised.
- Pending requests from deleted accounts: deleted after **90 days**.
- Backups: database backups (~14 days) still contain deleted data until they roll off; disclosed in the Privacy Policy.
- Personal-data deletion requests: a user (or you via a support request) can ask for kept messages/attachments to be removed early; the only exception is confirmed-booking records needed for legal/financial reasons, which stay anonymised.

## Deletion screen wording
Step 1 adds a notice: "Your profile, photos and login will be deleted. Messages you sent, attachments, and confirmed bookings will remain visible to the other people involved, shown as 'Deleted User'." Privacy Policy updated to match.

## Existing data migration
- No existing message, booking or file is deleted by the migration.
- Backfill saved names on manual calendar events so they never show blank.
- Orphaned files report: list files in storage whose owner folder no longer matches an account or whose URL isn't referenced anywhere. Report first; delete only after you approve the list.

## Testing
- Automated database tests: delete a test artist with a confirmed gig, pending request, messages and attachment → gig still confirmed on venue calendar as "Deleted Artist"; request not acceptable; venue still reads messages and opens attachment; photos gone; same email signs up fresh with empty account.
- Same in reverse for a venue.
- Simulated storage failure → job retries and succeeds.
- Click-through in the preview with two test accounts.

## Rollback
- Every link-rule change is additive; the old columns stay, so reverting the app code restores old behaviour.
- Saved before/after snapshot of link rules; reverse migration restores the cascade rules if needed.
- Deleted files and logins cannot be undone — so testing runs only on throwaway test accounts.

## Conflicts with the current setup
- The current "messages / bookings cascade" design must change; this is the largest change.
- Rooms currently vanish with the venue; they must linger (hidden) while bookings refer to them.
- Profile visibility rule relies on shared messages/bookings; it must ignore deleted placeholders.
- The welcome message sender uses a special system account; it must not be affected.
- Old public photo links in caches/CDNs may show for a short time after deletion.

## Decisions I need from you
- **A.** Decided: keep the band/venue name followed by ": Deleted Artist" or ": Deleted Venue".
- **B.** Accept the retention periods above, or set your own?
- **C.** When a venue is deleted, should the artist's confirmed future gigs stay listed as "confirmed" (requirement says yes), with a note that the venue account is gone?
- **D.** Orphaned files: report only, or delete after you review the list?
