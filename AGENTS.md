# Architecture rules

- Use the shared VenueCardGallery for public and signed-in discovery cards, sourcing photos only from the venue profile with its legacy picture fallback, so discovery matches the profile gallery without exposing room photos.