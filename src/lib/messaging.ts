import { supabase } from '@/integrations/supabase/client';

export async function getOrCreateThreadId(userId: string, otherId: string): Promise<string> {
  const { data } = await supabase
    .from('messages')
    .select('thread_id')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`
    )
    .limit(1);
  if (data && data.length > 0) return data[0].thread_id as string;
  return crypto.randomUUID();
}

export async function sendVenueArtistMessage(params: {
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
}) {
  const threadId = await getOrCreateThreadId(params.senderId, params.receiverId);
  await supabase.from('messages').insert({
    thread_id: threadId,
    sender_id: params.senderId,
    receiver_id: params.receiverId,
    subject: params.subject,
    content: params.content,
    is_read: false,
    is_starred: false,
  });
}