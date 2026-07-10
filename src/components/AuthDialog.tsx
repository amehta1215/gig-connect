import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'artist' | 'venue' | 'both';
type AuthMode = 'login' | 'signup' | 'forgot';

const emailSchema = z.string().email('Invalid email');
const passwordSchema = z.string().min(6, 'Min 6 characters');

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: AuthMode;
  promptMessage?: string;
}

export default function AuthDialog({ open, onOpenChange, defaultMode = 'login', promptMessage }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, profile, loading, isNewUser, clearNewUserFlag } = useAuth();
  const navigate = useNavigate();

  // Reset form when mode changes or dialog opens
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setErrors({});
      setEmailSent(false);
      setResetSent(false);
    }
  }, [open, defaultMode]);

  // Handle successful auth - redirect appropriately
  useEffect(() => {
    if (!loading && user && profile && open) {
      onOpenChange(false);
      if (isNewUser) {
        const targetProfile = profile.role === 'venue' ? '/venue/profile' : '/artist/profile';
        clearNewUserFlag();
        navigate(targetProfile);
      } else {
        const targetDashboard = profile.role === 'venue' ? '/venue' : '/artist';
        navigate(targetDashboard);
      }
    }
  }, [user, profile, loading, isNewUser, open]);

  const validateLoginForm = () => {
    const newErrors: Record<string, string> = {};
    try { emailSchema.parse(email); } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }
    try { passwordSchema.parse(password); } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignUpForm = () => {
    const newErrors: Record<string, string> = {};
    try { emailSchema.parse(email); } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }
    try { passwordSchema.parse(password); } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
    }
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords don't match";
    if (!firstName.trim()) newErrors.firstName = 'Required';
    if (!lastName.trim()) newErrors.lastName = 'Required';
    if (!role) newErrors.role = 'Pick one';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Wrong credentials');
        } else {
          toast.error(error.message);
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignUpForm()) return;
    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, firstName, lastName, role!);
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Email taken');
        } else {
          toast.error(error.message);
        }
      } else {
        setEmailSent(true);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    // keep email so it carries across login <-> forgot
    if (newMode === 'signup') setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setRole(null);
    setEmailSent(false);
    setResetSent(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    try { emailSchema.parse(email); } catch (err) {
      if (err instanceof z.ZodError) newErrors.email = err.errors[0].message;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setResetSent(true);
        toast.success('Check your email for the reset link');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-transparent border-0 border-b border-muted-foreground/30 rounded-none px-0 py-3 font-display text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors";

  // Email confirmation view
  if (emailSent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-md text-center p-8 sm:p-10">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl tracking-wide text-foreground">
              CHECK YOUR EMAIL
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-4">
              We sent a verification link to <span className="text-foreground font-medium">{email}</span>. Click the link to activate your account.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={() => switchMode('login')}
            className="mt-6 text-accent hover:underline font-display text-sm uppercase tracking-widest"
          >
            Back to Login
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md p-8 sm:p-10">
        <DialogHeader className="pr-8">
          <DialogTitle className="font-display text-3xl md:text-4xl tracking-wide text-foreground text-center">
            {mode === 'login' ? 'LOGIN' : mode === 'signup' ? 'SIGN UP' : 'RESET PASSWORD'}
          </DialogTitle>
          {promptMessage && (
            <DialogDescription className="text-muted-foreground text-center mt-2">
              {promptMessage}
            </DialogDescription>
          )}
        </DialogHeader>

        {mode === 'forgot' ? (
          resetSent ? (
            <div className="mt-6 text-center space-y-6">
              <p className="text-muted-foreground font-display">
                We sent a reset link to <span className="text-foreground font-medium">{email}</span>.
              </p>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-accent hover:underline font-display text-sm uppercase tracking-widest"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-6 mt-4">
              <div>
                <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
                {errors.email && <p className="text-accent text-xs mt-1 font-display">{errors.email}</p>}
              </div>

              <button
                type="submit"
                className="w-full h-12 font-display uppercase tracking-widest text-lg text-accent-foreground transition-colors bg-accent hover:bg-accent/90"
                disabled={isLoading}
              >
                {isLoading ? '...' : 'SEND RESET LINK'}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-foreground hover:underline font-medium"
                >
                  Login
                </button>
              </p>
            </form>
          )
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6 mt-4">
            <div>
              <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              {errors.email && <p className="text-accent text-xs mt-1 font-display">{errors.email}</p>}
            </div>

            <div>
              <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              {errors.password && <p className="text-accent text-xs mt-1 font-display">{errors.password}</p>}
            </div>

    <p className="text-right">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-sm font-display text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot your password?
              </button>
            </p>

            <button
              type="submit"
              className="w-full h-12 font-display uppercase tracking-widest text-lg text-accent-foreground transition-colors bg-accent hover:bg-accent/90"
              disabled={isLoading}
            >
              {isLoading ? '...' : 'LOGIN'}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-foreground hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-5 mt-4">
            {/* Role selection */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {(['artist', 'venue', 'both'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`p-2 text-center font-display uppercase tracking-widest text-xs transition-colors border ${
                      role === r
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent text-muted-foreground border-muted-foreground/30 hover:border-foreground hover:text-foreground'
                    }`}
                  >
                    {r === 'both' ? 'BOTH' : r.toUpperCase()}
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-accent text-xs font-display">{errors.role}</p>}
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                  First Name *
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
                {errors.firstName && <p className="text-accent text-xs mt-1 font-display">{errors.firstName}</p>}
              </div>
              <div>
                <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                  Last Name *
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
                {errors.lastName && <p className="text-accent text-xs mt-1 font-display">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              {errors.email && <p className="text-accent text-xs mt-1 font-display">{errors.email}</p>}
            </div>

            <div>
              <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              {errors.password && <p className="text-accent text-xs mt-1 font-display">{errors.password}</p>}
            </div>

            <div>
              <label className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
              {errors.confirmPassword && <p className="text-accent text-xs mt-1 font-display">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              className="w-full h-12 font-display uppercase tracking-widest text-lg text-accent-foreground transition-colors bg-accent hover:bg-accent/90"
              disabled={isLoading}
            >
              {isLoading ? '...' : 'SIGN UP'}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-foreground hover:underline font-medium"
              >
                Log in
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
