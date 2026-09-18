# Artist photo cropping

## Goal
Let artists crop each selected profile photo before it uploads, using the same 4:3 frame shown throughout artist profiles.

## Changes
- Add a focused crop dialog with drag-to-position and zoom controls.
- Process selected photos one at a time, preserving the six-photo limit and existing file validation.
- Export each crop as a 4:3 image, then upload it through the current artist media flow.
- Change the PICTURES editor thumbnails from square to 4:3 so their clipping matches the published profile display.
- Keep cancel behavior safe: cancelling a crop skips that photo without affecting existing photos.

## Technical details
- Use the browser canvas API for the cropped image output; no backend or database changes.
- Preserve animated GIF uploads without destructive canvas conversion by showing the 4:3 framing preview and uploading the original GIF.
- Verify the build and test the upload/crop dialog at desktop and phone sizes.
