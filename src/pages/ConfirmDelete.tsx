import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function ConfirmDelete() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const run = async (accessToken: string) => {
      if (started.current) return;
      started.current = true;
      const { error: fnError } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (fnError) {
        setError('We could not delete your account. Please try again from your profile.');
        return;
      }
      await supabase.auth.signOut();
      navigate('/account-deleted', { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) run(session.access_token);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) run(session.access_token);
    });
    const timeout = setTimeout(() => {
      if (!started.current) setError('This deletion link is invalid or has expired.');
    }, 8000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl">{error ? 'SOMETHING WENT WRONG' : 'DELETING YOUR ACCOUNT'}</h1>
        <p className="text-muted-foreground text-sm">{error ?? 'One moment...'}</p>
      </div>
    </div>
  );
}
