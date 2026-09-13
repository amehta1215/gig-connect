import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import setHoundLogo from '@/assets/set-hound-logo.png';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'artist' | 'venue';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/');
      } else if (requiredRole && profile) {
        // Check if user has access to required role
        const hasAccess = 
          profile.role === 'both' || 
          profile.role === requiredRole;

        if (!hasAccess) {
          // Redirect to their appropriate dashboard
          const targetDashboard = profile.role === 'venue' ? '/venue' : '/artist';
          navigate(targetDashboard);
        }
      }
    }
  }, [user, profile, loading, requiredRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src={setHoundLogo} alt="Set Hound" className="h-10 w-auto animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
