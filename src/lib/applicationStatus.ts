import { supabase } from '@/integrations/supabase/client';

/**
 * Re-evaluates application statuses after gig listings are deleted.
 *
 * An application is only moved to `emptyStatus` (usually 'archived') when the
 * artist has ZERO remaining holds or confirmed dates tied to that application.
 * If any hold or confirmed date is still on the calendar, the application stays
 * 'accepted'.
 */
export async function reconcileApplicationStatuses(
  applicationIds: (string | null | undefined)[],
  emptyStatus: 'archived' | 'in_progress' = 'archived'
): Promise<void> {
  const ids = Array.from(new Set(applicationIds.filter(Boolean) as string[]));
  if (ids.length === 0) return;

  const { data: remaining } = await supabase
    .from('gig_listings')
    .select('application_id')
    .in('application_id', ids);

  const stillBooked = new Set((remaining || []).map(r => r.application_id).filter(Boolean) as string[]);

  const toEmpty = ids.filter(id => !stillBooked.has(id));
  const toAccepted = ids.filter(id => stillBooked.has(id));

  if (toEmpty.length > 0) {
    await supabase.from('applications').update({ status: emptyStatus }).in('id', toEmpty);
  }
  if (toAccepted.length > 0) {
    await supabase.from('applications').update({ status: 'accepted' }).in('id', toAccepted);
  }
}
