import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, LogOut, ArrowLeftRight, Heart } from 'lucide-react';
import AuthDialog from '@/components/AuthDialog';
import Footer from '@/components/Footer';
import setHoundLogo from '@/assets/set-hound-logo.png';
interface Tab {
  label: string;
  href: string;
}
interface DashboardLayoutProps {
  children: ReactNode;
  tabs: Tab[];
}
export default function DashboardLayout({
  children,
  tabs
}: DashboardLayoutProps) {
  const {
    profile,
    activeRole,
    setActiveRole,
    signOut
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogMessage, setAuthDialogMessage] = useState('');
  const [authDialogMode, setAuthDialogMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Open the auth dialog from a ?auth=login|signup|forgot query param, then clean the URL
  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'signup' || authParam === 'forgot') {
      setAuthDialogMessage('');
      setAuthDialogMode(authParam);
      setAuthDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('auth');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  const handleSwitchRole = () => {
    const newRole = activeRole === 'artist' ? 'venue' : 'artist';
    setActiveRole(newRole);
    navigate(newRole === 'artist' ? '/artist' : '/venue');
  };
  const canSwitchRole = profile?.role === 'both';
  const targetRole = activeRole === 'artist' ? 'venue' : 'artist';
  const handleSwitchPrompt = () => {
    if (canSwitchRole) {
      handleSwitchRole();
      return;
    }
    setAuthDialogMessage(
      targetRole === 'venue'
        ? 'Login or sign up to see venue tools'
        : 'Login or sign up to see artist tools'
    );
    setAuthDialogMode('login');
    setAuthDialogOpen(true);
  };
  const editProfilePath = activeRole === 'artist' ? '/artist/profile' : '/venue/profile';
  return <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to={activeRole === 'artist' ? '/artist' : '/venue'} className="flex items-center gap-3 min-w-0">
              <img src={setHoundLogo} alt="Set Hound" className="h-14 w-auto py-1" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] hidden sm:block">
                {activeRole}
              </span>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center">
              {tabs.map(tab => {
              const isActive = location.pathname === tab.href || tab.href !== '/artist' && tab.href !== '/venue' && location.pathname.startsWith(tab.href);
              return <Link key={tab.href} to={tab.href} className={`px-4 py-4 text-sm font-display tracking-widest transition-all border-b-2 -mb-px ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {tab.label}
                  </Link>;
            })}
            </nav>

            {/* Switch & User Menu */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchPrompt}
                className="flex md:hidden items-center gap-1 px-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-display tracking-wider whitespace-nowrap uppercase">
                  Switch to {targetRole}
                </span>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(editProfilePath, {
                  state: {
                    fromDropdown: true
                  }
                })}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  {activeRole === 'artist' && <DropdownMenuItem onClick={() => navigate('/artist/favorites')}>
                      <Heart className="mr-2 h-4 w-4" />
                      Favorites
                    </DropdownMenuItem>}
                  {canSwitchRole && <DropdownMenuItem onClick={handleSwitchRole}>
                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                      {activeRole === 'artist' ? 'Venue Mode' : 'Artist Mode'}
                    </DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-accent">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto -mx-4 px-4">
            {tabs.map(tab => {
            const isActive = location.pathname === tab.href || tab.href !== '/artist' && tab.href !== '/venue' && location.pathname.startsWith(tab.href);
            return <Link key={tab.href} to={tab.href} className={`px-3 py-1.5 text-xs font-display tracking-widest whitespace-nowrap transition-all ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab.label}
                </Link>;
          })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-6 py-6 flex-1">
        {children}
      </main>
      <Footer />

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultMode={authDialogMode}
        promptMessage={authDialogMessage}
      />
    </div>;
}
