import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';

export interface BookingConflict {
  id: string;
  gigDate: string;
  showTime: string | null;
  artistName: string;
  roomName: string;
}

/**
 * Finds any OTHER confirmed gigs for the same room on the given dates.
 * Used to warn (not block) venues about double-booking a room on the same night.
 */
export async function findConfirmedConflicts(
  venueListingId: string,
  dateStrs: string[],
  excludeGigId?: string
): Promise<BookingConflict[]> {
  if (!venueListingId || dateStrs.length === 0) return [];

  let query = supabase
    .from('gig_listings')
    .select('id, gig_date, show_time, artist_id, manual_artist_name')
    .eq('venue_listing_id', venueListingId)
    .eq('is_confirmed', true)
    .in('gig_date', dateStrs);

  if (excludeGigId) query = query.neq('id', excludeGigId);

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

  const { data: listing } = await supabase
    .from('venue_listings')
    .select('venue_name, room_name')
    .eq('id', venueListingId)
    .maybeSingle();
  const roomName = listing?.room_name || listing?.venue_name || 'this room';

  const artistIds = Array.from(
    new Set(rows.filter(r => !r.manual_artist_name).map(r => r.artist_id))
  );

  const nameById = new Map<string, string>();
  if (artistIds.length > 0) {
    const [{ data: artistProfiles }, { data: profiles }] = await Promise.all([
      supabase.from('artist_profiles').select('user_id, band_name').in('user_id', artistIds),
      supabase.from('profiles').select('id, first_name, last_name').in('id', artistIds),
    ]);
    for (const p of profiles || []) {
      nameById.set(p.id, `${p.first_name} ${p.last_name}`.trim());
    }
    for (const a of artistProfiles || []) {
      if (a.band_name) nameById.set(a.user_id, a.band_name);
    }
  }

  return rows.map(r => ({
    id: r.id,
    gigDate: r.gig_date,
    showTime: r.show_time,
    artistName: r.manual_artist_name || nameById.get(r.artist_id) || 'another artist',
    roomName,
  }));
}

export function describeConflict(c: BookingConflict): string {
  const dateText = format(parseLocalDate(c.gigDate), 'MMMM d, yyyy');
  const timeText = c.showTime ? ` at ${c.showTime.slice(0, 5)}` : '';
  return `${c.artistName} confirmed on ${dateText} at ${c.roomName}${timeText}`;
}

export function describeConflicts(conflicts: BookingConflict[]): string {
  if (conflicts.length === 0) return '';
  return `You already have ${conflicts.map(describeConflict).join('; ')}. Confirm this booking anyway?`;
}
