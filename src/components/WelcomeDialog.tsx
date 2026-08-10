import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'artist' | 'venue' | 'both';
  onDismiss: () => void;
}

export default function WelcomeDialog({ open, onOpenChange, role, onDismiss }: WelcomeDialogProps) {
  const navigate = useNavigate();
  const isVenue = role === 'venue';
  const profilePath = isVenue ? '/venue/profile' : '/artist/profile';

  const handleOpenChange = (next: boolean) => {
    if (!next) onDismiss();
    onOpenChange(next);
  };

  const handleCreateProfile = () => {
    onDismiss();
    onOpenChange(false);
    navigate(profilePath);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-md p-8 sm:p-10 text-center">
        <DialogHeader className="pr-8">
          <DialogTitle className="font-display text-3xl md:text-4xl tracking-wide text-foreground text-center">
            WELCOME TO SET HOUND
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center mt-2">
            {isVenue
              ? 'Complete your profile so artists can find you.'
              : 'Complete your profile so venues can find you.'}
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={handleCreateProfile}
          className="mt-6 w-full h-12 font-display uppercase tracking-widest text-lg text-accent-foreground bg-accent hover:bg-accent/90 transition-colors"
        >
          Create Profile
        </button>
      </DialogContent>
    </Dialog>
  );
}