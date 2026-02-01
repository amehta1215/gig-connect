import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

type UserRole = 'artist' | 'venue' | 'both';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  created_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  activeRole: 'artist' | 'venue';
  setActiveRole: (role: 'artist' | 'venue') => void;
  loading: boolean;
  isNewUser: boolean;
  clearNewUserFlag: () => void;
  signUp: (email: string, password: string, firstName: string, lastName: string, role: UserRole) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeRole, setActiveRole] = useState<'artist' | 'venue'>('artist');
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  const clearNewUserFlag = () => {
    setIsNewUser(false);
  };

  const checkIfNewUser = (profileCreatedAt: string | null) => {
    if (!profileCreatedAt) return false;
    const createdAt = new Date(profileCreatedAt);
    const now = new Date();
    // Consider user as "new" if profile was created within the last 2 minutes
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    return createdAt > twoMinutesAgo;
  };

  const fetchProfile = async (userId: string, checkNew: boolean = false) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) {
      setProfile(data as Profile);
      // Set default active role based on user's role
      if (data.role === 'venue') {
        setActiveRole('venue');
      } else {
        setActiveRole('artist');
      }
      // Check if this is a new user (profile just created)
      if (checkNew && checkIfNewUser(data.created_at)) {
        setIsNewUser(true);
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer profile fetch to avoid deadlock
          // Check for new user on SIGNED_IN event (happens after email verification)
          const shouldCheckNew = event === 'SIGNED_IN';
          setTimeout(() => {
            fetchProfile(session.user.id, shouldCheckNew);
          }, 0);
        } else {
          setProfile(null);
          setIsNewUser(false);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: UserRole) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      activeRole,
      setActiveRole,
      loading,
      isNewUser,
      clearNewUserFlag,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
