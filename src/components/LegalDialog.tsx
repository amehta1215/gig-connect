import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { privacyParagraphs, termsParagraphs } from '@/content/legal';

interface LegalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LegalDialog({ open, onOpenChange }: LegalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display uppercase tracking-tight text-2xl font-black text-primary">
            Terms of Service & Privacy Policy
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-6 space-y-8">
          <section className="space-y-4">
            <h3 className="font-display uppercase tracking-widest text-xs text-muted-foreground">
              Terms of Service
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              {termsParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="font-display uppercase tracking-widest text-xs text-muted-foreground">
              Privacy Policy
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              {privacyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
