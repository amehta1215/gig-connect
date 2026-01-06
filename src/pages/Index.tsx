import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { z } from 'zod';
import openingImg from '@/assets/opening.png';

type AuthMode = 'login' | 'signup';
type UserRole = 'artist' | 'venue' | 'both';

const emailSchema = z.string().email('Invalid email');
const passwordSchema = z.string().min(6, 'Min 6 characters');

export default function Index() {
  const [modalOpen, setModalOpen] = useState(false);
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

  const openModal = (authMode: AuthMode) => {
    setMode(authMode);
    setModalOpen(true);
    setErrors({});
  };

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* POSTER HEADER - Title block */}
      <header className="bg-primary px-4 py-6 md:py-8">
        <h1 className="font-display text-[18vw] md:text-[14vw] leading-[0.85] text-primary-foreground tracking-tighter text-center">
          RIFF
        </h1>
      </header>

      {/* ACTION ROW - Like artist names on poster */}
      <div className="bg-background border-y border-border">
        <div className="flex">
          <button
            onClick={() => openModal('login')}
            className="flex-1 py-4 md:py-5 font-display text-2xl md:text-3xl tracking-wide text-foreground hover:bg-primary hover:text-primary-foreground transition-colors border-r border-border"
          >
            LOG IN
          </button>
          <button
            onClick={() => openModal('signup')}
            className="flex-1 py-4 md:py-5 font-display text-2xl md:text-3xl tracking-wide text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            SIGN UP
          </button>
        </div>
      </div>

      {/* MAIN IMAGE - Atmospheric B&W photo */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src={openingImg}
          alt=""
          className="w-full h-full object-cover object-center absolute inset-0 grayscale"
        />
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
      </div>

      {/* AUTH MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border p-0 max-w-sm">
          {/* Modal toggle */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-4 font-display text-lg tracking-wide transition-all border-b-2 -mb-px ${
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
              className={`flex-1 py-4 font-display text-lg tracking-wide transition-all border-b-2 -mb-px ${
                mode === 'signup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                        className={`p-3 border transition-all text-center font-display text-base tracking-wide ${
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
