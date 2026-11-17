import { supabase } from '@/integrations/supabase/client';

export interface PartyProfile {
  first_name: string;
  last_name: string;
  artist_profiles?: { band_name: string | null } | null;
  venue_profiles?: { venue_name: string | null } | null;
  is_deleted?: boolean;
}

/** Labels for accounts that have been deleted, e.g. "The Parlor: Deleted Venue". */
export async function fetchDeletedLabels(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase.from('deleted_accounts').select('id, display_label').in('id', unique);
  return Object.fromEntries((data ?? []).map((d) => [d.id, d.display_label]));
}

/** Profiles (with band/venue names) for a set of user ids; deleted users get a label. */
export async function fetchParties(ids: string[]): Promise<Record<string, PartyProfile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const [{ data }, deleted] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, artist_profiles(band_name), venue_profiles(venue_name)')
      .in('id', unique),
    fetchDeletedLabels(unique),
  ]);
  const map: Record<string, PartyProfile> = {};
  for (const p of (data ?? []) as any[]) {
    const ap = Array.isArray(p.artist_profiles) ? p.artist_profiles[0] : p.artist_profiles;
    const vp = Array.isArray(p.venue_profiles) ? p.venue_profiles[0] : p.venue_profiles;
    map[p.id] = { first_name: p.first_name, last_name: p.last_name, artist_profiles: ap ?? null, venue_profiles: vp ?? null };
  }
  for (const id of unique) {
    if (!map[id] && deleted[id]) {
      map[id] = { first_name: deleted[id], last_name: '', artist_profiles: null, venue_profiles: null, is_deleted: true };
    } else if (!map[id] && id === '00000000-0000-0000-0000-000000000000') {
      map[id] = { first_name: 'SET HOUND', last_name: 'Team', artist_profiles: null, venue_profiles: null };
    }
  }
  return map;
}

/** Adds sender/receiver objects to messages, matching the old embedded shape. */
export async function attachMessageParties<T extends { sender_id: string; receiver_id: string }>(rows: T[]) {
  const parties = await fetchParties(rows.flatMap((m) => [m.sender_id, m.receiver_id]));
  return rows.map((m) => ({ ...m, sender: parties[m.sender_id] ?? null, receiver: parties[m.receiver_id] ?? null }));
}
