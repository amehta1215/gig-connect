import { File, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
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

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const { toast } = useToast();
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  // Parse attachments if it's a string
  const parsedAttachments: Attachment[] = (() => {
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
