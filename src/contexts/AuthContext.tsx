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
  signUp: (email: string, password: string, firstName: string, lastName: string, role: UserRole, termsAcceptedAt?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

// Keep a single context instance across hot reloads so the provider and
// consumers never end up referencing different context objects.
const globalAny = globalThis as any;
const AuthContext: React.Context<AuthContextType | undefined> =
  globalAny.__SH_AUTH_CONTEXT__ ?? (globalAny.__SH_AUTH_CONTEXT__ = createContext<AuthContextType | undefined>(undefined));

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
    // Consider user as "new" if profile was created within the last 30 minutes
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    return createdAt > thirtyMinutesAgo;
  };

  const fetchProfile = async (userId: string, checkNew: boolean = false) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, created_at')
      .eq('id', userId)
      .single();

    if (data && !error) {
      const { data: userData } = await supabase.auth.getUser();
      setProfile({ ...(data as any), email: userData.user?.email ?? '' } as Profile);
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

    // THEN restore any saved session so users stay logged in between visits
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: UserRole, termsAcceptedAt?: string) => {
    (window as any).__SH_SIGNED_IN_THIS_VISIT__ = true;
    const redirectUrl = `${window.location.origin}/`;

    // Normalize credentials so stray whitespace (common with mobile keyboards
    // and password managers) can never be baked into the stored password.
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role: role,
          terms_accepted_at: termsAcceptedAt ?? new Date().toISOString(),
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    (window as any).__SH_SIGNED_IN_THIS_VISIT__ = true;
    // Login aliases: alternate addresses that sign in to an existing account.
    const LOGIN_ALIASES: Record<string, string> = {
      'theparlor@gmail.com': 'examplevenue@gmail.com',
    };
    const enteredEmail = email.trim().toLowerCase();
    const normalizedEmail = LOGIN_ALIASES[enteredEmail] ?? enteredEmail;
    const trimmedPassword = password.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: trimmedPassword,
    });

    // Fall back to the raw value for accounts created before passwords were
    // trimmed (where a leading/trailing space is part of the stored password).
    if (error && trimmedPassword !== password) {
      const retry = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      return { error: retry.error };
    }

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
