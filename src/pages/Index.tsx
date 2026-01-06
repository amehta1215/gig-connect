import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Music2, Building2, ArrowRight, Sparkles } from 'lucide-react';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      // Redirect logged in users to their dashboard
      const targetDashboard = profile.role === 'venue' ? '/venue' : '/artist';
      navigate(targetDashboard);
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-display text-4xl">RIFF</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-concert-gradient opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />

      {/* Diagonal RIFF watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h1 className="font-display text-[30vw] text-primary/5 diagonal-text whitespace-nowrap">
          RIFF
        </h1>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <div className="font-display text-4xl text-primary">RIFF</div>
          <Button onClick={() => navigate('/auth')} variant="outline">
            Log In
          </Button>
        </header>

        {/* Hero */}
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-4xl text-center">
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl text-gradient mb-6 leading-none">
              WHERE ARTISTS<br />MEET STAGES
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10">
              The marketplace connecting talented artists with the perfect venues. Book gigs, manage applications, and grow your music career.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg font-display tracking-wide group"
                onClick={() => navigate('/auth')}
              >
                <Music2 className="mr-2 h-5 w-5" />
                I'm an Artist
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="text-lg font-display tracking-wide group"
                onClick={() => navigate('/auth')}
              >
                <Building2 className="mr-2 h-5 w-5" />
                I'm a Venue
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 text-left">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Music2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-xl mb-2">Find Your Stage</h3>
                <p className="text-muted-foreground text-sm">
                  Browse venues by location, genre, and capacity. Apply to gigs that match your style.
                </p>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 text-left">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-display text-xl mb-2">Discover Talent</h3>
                <p className="text-muted-foreground text-sm">
                  Receive applications from artists. Review their profiles, samples, and past gigs.
                </p>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 text-left">
                <div className="w-12 h-12 bg-riff-blue/10 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-riff-blue" />
                </div>
                <h3 className="font-display text-xl mb-2">Simple Booking</h3>
                <p className="text-muted-foreground text-sm">
                  Manage applications, messages, and bookings all in one place. No hassle.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-muted-foreground text-sm">
          © 2026 RIFF. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
