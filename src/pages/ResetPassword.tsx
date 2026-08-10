import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { validatePassword } from '@/lib/validation';
import { PasswordChecklist } from '@/components/PasswordChecklist';
import { toast } from 'sonner';

type State = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPassword() {
  const [state, setState] = useState<State>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setState('ready');
    });
    supabase.auth.getSession().then(({ data }) => {
      setState((prev) => (prev === 'ready' ? prev : data.session ? 'ready' : 'invalid'));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;
    if (password !== confirm) next.confirm = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setState('done');
  };

  const inputClass =
    'w-full bg-transparent border-0 border-b border-muted-foreground/30 rounded-none px-0 py-3 font-display text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors';

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8">
        <h1 className="font-display text-3xl tracking-wide text-foreground text-center">
          {state === 'done' ? 'PASSWORD UPDATED' : 'SET NEW PASSWORD'}
        </h1>

        {state === 'checking' && (
          <p className="mt-6 text-center text-muted-foreground font-display">...</p>
        )}

        {state === 'invalid' && (
          <div className="mt-6 text-center space-y-4">
            <p className="text-muted-foreground font-display">
              This reset link is invalid or has expired.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block text-accent hover:underline font-display text-sm uppercase tracking-widest"
            >
              Request a new link
            </Link>
          </div>
        )}

        {state === 'done' && (
          <div className="mt-6 text-center space-y-4">
            <p className="text-muted-foreground font-display">
              Your password has been updated.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="text-accent hover:underline font-display text-sm uppercase tracking-widest"
            >
              Go to Login
            </button>
          </div>
        )}

        {state === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div>
              <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                New Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              {errors.password && (
                <p className="text-accent text-xs mt-1 font-display">{errors.password}</p>
              )}
              <PasswordChecklist value={password} />
            </div>

            <div>
              <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
              {errors.confirm && (
                <p className="text-accent text-xs mt-1 font-display">{errors.confirm}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 font-display uppercase tracking-widest text-lg text-accent-foreground bg-accent hover:bg-accent/90 transition-colors"
            >
              {saving ? '...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}