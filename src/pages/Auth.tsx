import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { z } from 'zod';

type AuthMode = 'login' | 'signup';
type UserRole = 'artist' | 'venue' | 'both';

const emailSchema = z.string().email('Invalid email');
const passwordSchema = z.string().min(6, 'Min 6 characters');

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      const targetDashboard = profile.role === 'venue' ? '/venue' : '/artist';
      navigate(targetDashboard);
    }
  }, [user, profile, loading, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (mode === 'signup') {
      if (!firstName.trim()) newErrors.firstName = 'Required';
      if (!lastName.trim()) newErrors.lastName = 'Required';
      if (!role) newErrors.role = 'Pick one';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Wrong credentials');
          } else {
            toast.error(error.message);
          }
        }
      } else {
        const { error } = await signUp(email, password, firstName, lastName, role!);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Email taken');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome to RIFF');
        }
      }
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-display text-6xl">RIFF</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background glow */}
      <div className="absolute inset-0 bg-heat" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
      
      {/* Noise overlay */}
      <div className="absolute inset-0 bg-noise pointer-events-none" />
      
      {/* Giant diagonal RIFF */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h1 className="font-display text-[35vw] text-primary/[0.08] diagonal-text whitespace-nowrap tracking-tighter">
          RIFF
        </h1>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <h1 className="font-display text-7xl md:text-8xl text-primary glow-primary inline-block tracking-tight">
              RIFF
            </h1>
          </div>

          {/* Auth form */}
          <div className="bg-card/90 border border-border p-6">
            {/* Toggle */}
            <div className="flex border-b border-border mb-6">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-3 text-sm font-display text-lg tracking-wide transition-all border-b-2 -mb-px ${
                  mode === 'login'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                LOG IN
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-3 text-sm font-display text-lg tracking-wide transition-all border-b-2 -mb-px ${
                  mode === 'signup'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                SIGN UP
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  {/* Role selection */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {(['artist', 'venue', 'both'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`p-3 border transition-all text-center font-display text-lg tracking-wide ${
                            role === r
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          {r === 'both' ? 'BOTH' : r.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {errors.role && <p className="text-destructive text-xs">{errors.role}</p>}
                  </div>

                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First"
                        className="bg-background border-border"
                      />
                      {errors.firstName && <p className="text-destructive text-xs mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last"
                        className="bg-background border-border"
                      />
                      {errors.lastName && <p className="text-destructive text-xs mt-1">{errors.lastName}</p>}
                    </div>
                  </div>
                </>
              )}

              <div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="bg-background border-border"
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-background border-border"
                />
                {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
              </div>

              <Button
                type="submit"
                className="w-full font-display text-xl tracking-widest h-12"
                disabled={isLoading}
              >
                {isLoading ? '...' : mode === 'login' ? 'ENTER' : 'JOIN'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
