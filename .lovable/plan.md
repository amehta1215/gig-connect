# Fix Venue Profile Preview Proportions

## Goal
Make the venue owner's profile preview match the proportions and formatting of the actual venue profile instead of stretching across the full viewport.

## Changes
- Keep the preview as a full-screen, scrollable modal.
- Place the rendered venue profile inside a centered responsive container with a sensible maximum width.
- Adjust preview padding for mobile and desktop so the gallery, headings, bio, and room cards retain their intended proportions.
- Leave profile data, saving behavior, and public/artist-facing pages unchanged.

## Validation
- Open the venue profile preview at desktop and mobile widths.
- Confirm the content is centered, images are not stretched, room cards remain readable, and the close control stays accessible.
- Confirm the project builds successfully.
