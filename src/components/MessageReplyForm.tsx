import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, X } from 'lucide-react';

interface MessageReplyFormProps {
  threadId: string;
  originalSubject: string | null;
  senderId: string;
  receiverId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MessageReplyForm({
  threadId,
  originalSubject,
  senderId,
  receiverId,
  onSuccess,
  onCancel,
}: MessageReplyFormProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const subject = originalSubject?.startsWith('Re: ') 
    ? originalSubject 
    : `Re: ${originalSubject || '(No subject)'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      subject,
      content: content.trim(),
      sender_id: senderId,
      receiver_id: receiverId,
    });

    if (error) {
      toast.error('Failed to send message');
    } else {
      toast.success('Message sent');
      setContent('');
      onSuccess();
    }
    setSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border p-4 space-y-2 relative">
      <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="absolute top-2 right-2 h-6 w-6">
        <X className="h-3 w-3" />
      </Button>
      <Textarea
        placeholder="Write your reply..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[120px] bg-background border-border resize-none"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={sending || !content.trim()}>
          <Send className="h-4 w-4 mr-2" />
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </form>
  );
}
