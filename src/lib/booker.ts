export type AccountType = 'artist' | 'venue' | 'both' | 'booker';

export function isVenueAccount(role?: string | null) {
  return role === 'venue' || role === 'booker';
}

export function companyInformation(profile?: { is_booker?: boolean; show_company_info?: boolean; venue_name?: string | null; bio?: string | null } | null) {
  if (!profile?.is_booker || !profile.show_company_info || !profile.venue_name) return null;
  return { name: profile.venue_name, bio: profile.bio || null };
}

export function discoveryKey(listing: { id: string; venue_profile_id: string }, profile?: { is_booker?: boolean }) {
  return profile?.is_booker ? listing.id : listing.venue_profile_id;
}

export function canUseDashboard(role: string | undefined, dashboard: 'artist' | 'venue') {
  return role === 'both' || role === dashboard || (dashboard === 'venue' && role === 'booker');
}

export function bookerDiscoverable(companyName: string | null | undefined, listings: { is_published: boolean }[]) {
  return Boolean(companyName?.trim()) && listings.some(l => l.is_published);
}

export interface BookerVenueDraft {
  venue_name: string;
  location: string;
  capacity: string;
  genres: string[];
  bio: string;
  backline_info: string;
  house_rules: string;
}

// Every field in the Add Venue section must be filled before a Booker venue can go live.
export const BOOKER_VENUE_REQUIRED_FIELDS = [
  'Venue Photos',
  'Venue Name',
  'Capacity',
  'Location',
  'Genres',
  'About',
  'Backline',
  'Rules'
] as const;

export function missingBookerVenueFields(draft: BookerVenueDraft, pictures: string[]) {
  const missing: string[] = [];
  const capacity = Number(draft.capacity);
  if (!pictures.length) missing.push('Venue Photos');
  if (!draft.venue_name.trim()) missing.push('Venue Name');
  if (!draft.capacity.trim() || !Number.isFinite(capacity) || capacity <= 0) missing.push('Capacity');
  if (!draft.location.trim()) missing.push('Location');
  if (!draft.genres.length) missing.push('Genres');
  if (!draft.bio.trim()) missing.push('About');
  if (!draft.backline_info.trim()) missing.push('Backline');
  if (!draft.house_rules.trim()) missing.push('Rules');
  return missing;
}