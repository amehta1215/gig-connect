import { File, Image, Download } from 'lucide-react';

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

  return (
    <div className="mt-3 space-y-2">
      {parsedAttachments.map((attachment, index) => (
        <a
          key={index}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-background/50 border border-border hover:bg-background transition-colors text-sm group"
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
          <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </a>
      ))}
    </div>
  );
}