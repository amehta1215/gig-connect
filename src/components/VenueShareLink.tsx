import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface VenueShareLinkProps {
  slug?: string | null;
}

export default function VenueShareLink({ slug }: VenueShareLinkProps) {
  if (!slug) return null;

  const shareUrl = `https://www.sethound.com/venues/${slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="border-t border-border pt-3">
      <h3 className="font-display text-base text-primary tracking-wide mb-1">SHAREABLE LINK</h3>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={shareUrl}
          className="text-xs text-muted-foreground underline underline-offset-2 break-all hover:text-primary"
        >
          {shareUrl}
        </a>
        <Button type="button" variant="outline" size="sm" onClick={copyLink} className="h-7 px-2 text-xs font-display tracking-wide">
          <Copy className="h-3 w-3 mr-1" /> COPY LINK
        </Button>
      </div>
    </div>
  );
}