# Architecture rules

- Render the privacy policy from one Markdown string in a TypeScript module (Markdown file imports broke the build) through PrivacyPolicyContent on the legal page and signup dialog so both show the same formatted policy.

- Use the shared VenueCardGallery for public and signed-in discovery cards, sourcing photos only from the venue profile with its legacy picture fallback, so discovery matches the profile gallery without exposing room photos.- Account deletion keeps shared records (messages, bookings) and replaces the deleted person with a saved label from deleted_accounts, so survivors keep their history without personal data; fetch other users via src/lib/accountParties instead of embedding profiles on messages/applications.
