import { File, Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface MessageAttachmentsProps {
  attachments: Attachment[] | string | null;
}

const BUCKET_MARKER = '/message-attachments/';
const pathFromUrl = (url: string) => {
  const i = url.indexOf(BUCKET_MARKER);
  return i >= 0 ? decodeURIComponent(url.slice(i + BUCKET_MARKER.length).split('?')[0]) : null;
};

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const { toast } = useToast();
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});

  // Parse attachments if it's a string
  const rawAttachments: Attachment[] = (() => {
    if (!attachments) return [];
    if (typeof attachments === 'string') {
      try {
        return JSON.parse(attachments);
      } catch {
        return [];
      }
    }
    return attachments;
  })();

  const key = rawAttachments.map((a) => a.url).join('|');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const a of rawAttachments) {
        const path = pathFromUrl(a.url);
        if (!path) continue;
        const { data } = await supabase.storage.from('message-attachments').createSignedUrl(path, 3600);
        if (data?.signedUrl) next[a.url] = data.signedUrl;
      }
      if (!cancelled) setSigned(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const parsedAttachments = rawAttachments.map((a) => ({ ...a, url: signed[a.url] ?? a.url }));

  if (parsedAttachments.length === 0) return null;

  const isImageType = (type: string) => type.startsWith('image/');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (attachment: Attachment, index: number) => {
    setDownloadingIndex(index);
    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast({
        title: "Download blocked",
        description: "Try disabling your ad blocker or open in incognito mode.",
        variant: "destructive",
      });
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {parsedAttachments.map((attachment, index) => (
        <button
          key={index}
          onClick={() => handleDownload(attachment, index)}
          disabled={downloadingIndex === index}
          className="flex items-center gap-2 p-2 bg-background/50 border border-border hover:bg-background transition-colors text-sm group w-full text-left"
        >
          {isImageType(attachment.type) ? (
            <>
              <img 
                src={attachment.url} 
                alt={attachment.name}
                className="h-12 w-12 object-cover border border-border"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
              </div>
            </>
          ) : (
            <>
              <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
              </div>
            </>
          )}
          {downloadingIndex === index ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
          ) : (
            <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
