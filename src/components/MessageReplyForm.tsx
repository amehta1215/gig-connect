import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, X, Paperclip, File, Image } from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subject = originalSubject?.startsWith('Re: ') 
    ? originalSubject 
    : `Re: ${originalSubject || '(No subject)'}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${senderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      newAttachments.push({
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
      });
    }

    setAttachments([...attachments, ...newAttachments]);
    setUploading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageType = (type: string) => type.startsWith('image/');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      subject,
      content: content.trim(),
      sender_id: senderId,
      receiver_id: receiverId,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : '[]',
    } as any);

    if (error) {
      toast.error('Failed to send message');
    } else {
      toast.success('Message sent');
      setContent('');
      setAttachments([]);
      onSuccess();
    }
    setSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border p-4 pt-2 space-y-2 relative">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="h-6 w-6">
          <X className="h-3 w-3" />
        </Button>
      </div>
      <Textarea
        placeholder="Write your reply..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[120px] bg-background border-border resize-none"
      />
      
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-secondary px-2 py-1 text-xs border border-border"
            >
              {isImageType(attachment.type) ? (
                <Image className="h-3 w-3 text-muted-foreground" />
              ) : (
                <File className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="max-w-[120px] truncate">{attachment.name}</span>
              <span className="text-muted-foreground">({formatFileSize(attachment.size)})</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="p-0.5 hover:bg-background/50 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-4 w-4 mr-1" />
            {uploading ? 'Uploading...' : 'Attach'}
          </Button>
        </div>
        <Button type="submit" disabled={sending || (!content.trim() && attachments.length === 0)}>
          <Send className="h-4 w-4 mr-2" />
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </form>
  );
}