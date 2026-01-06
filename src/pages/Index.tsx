import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      const targetDashboard = profile.role === 'venue' ? '/venue' : '/artist';
      navigate(targetDashboard);
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-display text-6xl">RIFF</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Heat gradient */}
      <div className="absolute inset-0 bg-heat" />
      
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
      
      {/* Noise */}
      <div className="absolute inset-0 bg-noise pointer-events-none" />

      {/* Giant diagonal RIFF */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h1 className="font-display text-[40vw] text-primary/[0.06] diagonal-text whitespace-nowrap tracking-tighter">
          RIFF
        </h1>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <div className="font-display text-4xl text-primary tracking-tight">RIFF</div>
          <Button 
            onClick={() => navigate('/auth')} 
            variant="outline"
            className="font-display tracking-widest border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
          >
            ENTER
          </Button>
        </header>

        {/* Hero */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-5xl">
            <h1 className="font-display poster-title text-foreground leading-none">
              ARTISTS<br />
              <span className="text-primary">MEET</span><br />
              STAGES
            </h1>
            
            <div className="mt-12 flex gap-4">
              <Button
                size="lg"
                className="font-display text-xl tracking-widest px-8 h-14"
                onClick={() => navigate('/auth')}
              >
                ARTIST
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="font-display text-xl tracking-widest px-8 h-14 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                onClick={() => navigate('/auth')}
              >
                VENUE
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
