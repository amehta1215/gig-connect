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