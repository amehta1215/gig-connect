import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeftRight } from 'lucide-react';

interface Tab {
  label: string;
  href: string;
  requiresAuth?: boolean;
}

interface PublicLayoutProps {
  children: ReactNode;
  tabs: Tab[];
}

export default function PublicLayout({ children, tabs }: PublicLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogMessage, setAuthDialogMessage] = useState('');

  const handleTabClick = (e: React.MouseEvent, tab: Tab) => {
    if (tab.requiresAuth) {
      e.preventDefault();
      setAuthDialogMessage('Login or sign up to explore more');
      setAuthDialogOpen(true);
    }
  };

  const handleSwitchToVenue = () => {
    setAuthDialogMessage('Login or sign up to see venue tools');
    setAuthDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-50">
        <div className="px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <span className="font-display text-3xl text-primary tracking-tight">RIFF</span>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center">
              {tabs.map((tab) => {
                const isActive = location.pathname === tab.href || 
                  (tab.href !== '/' && location.pathname.startsWith(tab.href));
                return (
                  <Link
                    key={tab.href}
                    to={tab.requiresAuth ? '#' : tab.href}
                    onClick={(e) => handleTabClick(e, tab)}
                    className={`px-4 py-4 text-sm font-display tracking-widest transition-all border-b-2 -mb-px ${
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            {/* Switch to Venue & Login Button */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSwitchToVenue}
                className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="text-xs font-display tracking-widest">SWITCH TO VENUE</span>
              </Button>
              <Button 
                onClick={() => navigate('/auth')} 
                size="sm"
                className="font-display tracking-widest"
              >
                LOGIN / SIGN UP
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto -mx-4 px-4">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.href ||
                (tab.href !== '/' && location.pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  to={tab.requiresAuth ? '#' : tab.href}
                  onClick={(e) => handleTabClick(e, tab)}
                  className={`px-3 py-1.5 text-xs font-display tracking-widest whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
            {/* Mobile Switch to Venue */}
            <button
              onClick={handleSwitchToVenue}
              className="px-3 py-1.5 text-xs font-display tracking-widest whitespace-nowrap text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeftRight className="h-3 w-3" />
              SWITCH TO VENUE
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-6 py-6">
        {children}
      </main>

      {/* Auth Required Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-accent tracking-wide">
              {authDialogMessage}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create an account or sign in to access all features
            </DialogDescription>
          </DialogHeader>
          <Button 
            onClick={() => navigate('/auth')} 
            className="w-full font-display tracking-widest text-lg h-12 mt-4"
          >
            LOGIN / SIGN UP
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
