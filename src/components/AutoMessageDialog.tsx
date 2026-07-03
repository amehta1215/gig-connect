import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface AutoMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMessage: string;
  recipientName: string;
  subject?: string;
  onSend: (message: string | null) => void | Promise<void>;
  onCancel?: () => void;
  sending?: boolean;
}

export default function AutoMessageDialog({
  open,
  onOpenChange,
  defaultMessage,
  recipientName,
  onSend,
  onCancel,
  sending,
}: AutoMessageDialogProps) {
  const [message, setMessage] = useState(defaultMessage);

  useEffect(() => {
    if (open) setMessage(defaultMessage);
  }, [open, defaultMessage]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && onCancel) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wide">
            NOTIFY {recipientName.toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[140px] text-sm"
            placeholder="Message to the artist..."
          />
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              if (onCancel) onCancel();
              onOpenChange(false);
            }}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => onSend(null)}
            disabled={sending}
          >
            Send without message
          </Button>
          <Button
            onClick={() => onSend(message.trim() || null)}
            disabled={sending}
            className="bg-primary hover:bg-primary/90"
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}