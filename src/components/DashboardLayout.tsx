import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, ArrowLeftRight } from 'lucide-react';

interface Tab {
  label: string;
  href: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  tabs: Tab[];
}

export default function DashboardLayout({ children, tabs }: DashboardLayoutProps) {
  const { profile, activeRole, setActiveRole, signOut } = useAuth();
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

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
  };

  const editProfilePath = activeRole === 'artist' ? '/artist/profile' : '/venue/profile';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={activeRole === 'artist' ? '/artist' : '/venue'} className="flex items-center gap-2">
              <span className="font-display text-3xl text-primary">RIFF</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest hidden sm:block">
                {activeRole}
              </span>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => {
                const isActive = location.pathname === tab.href || 
                  (tab.href !== '/artist' && tab.href !== '/venue' && location.pathname.startsWith(tab.href));
                return (
                  <Link
                    key={tab.href}
                    to={tab.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarFallback className="bg-secondary text-foreground font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(editProfilePath)}>
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                {canSwitchRole && (
                  <DropdownMenuItem onClick={handleSwitchRole}>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Switch to {activeRole === 'artist' ? 'Venue' : 'Artist'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.href ||
                (tab.href !== '/artist' && tab.href !== '/venue' && location.pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
