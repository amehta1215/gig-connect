import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, LogOut, ArrowLeftRight, Heart } from 'lucide-react';
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
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  const handleSwitchRole = () => {
    const newRole = activeRole === 'artist' ? 'venue' : 'artist';
    setActiveRole(newRole);
    navigate(newRole === 'artist' ? '/artist' : '/venue');
  };
  const canSwitchRole = profile?.role === 'both';
  const editProfilePath = activeRole === 'artist' ? '/artist/profile' : '/venue/profile';
  return <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-50">
        <div className="px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to={activeRole === 'artist' ? '/artist' : '/venue'} className="flex items-center gap-3">
              <span className="font-display text-3xl text-primary tracking-tight">RIFF</span>
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
      <main className="px-4 md:px-6 py-6">
        {children}
      </main>
    </div>;
}