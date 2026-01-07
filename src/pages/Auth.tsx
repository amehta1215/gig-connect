import openingImage from "@/assets/opening.png";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";

// If your project has shadcn Dialog, keep these imports.
// If you DON'T have them, tell me and I'll give you a no-dependency modal version.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuthMode = "login" | "signup";
type UserRole = "artist" | "venue" | "both";

const emailSchema = z.string().email("Invalid email");
const passwordSchema = z.string().min(6, "Min 6 characters");

export default function Auth() {
  // Modal control
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const photoUrl = openingImage;

  useEffect(() => {
    if (!loading && user && profile) {
      const targetDashboard = profile.role === "venue" ? "/venue" : "/artist";
      navigate(targetDashboard);
    }
  }, [user, profile, loading, navigate]);

  const resetErrors = () => setErrors({});

  const openLogin = () => {
    resetErrors();
    setMode("login");
    setOpen(true);
  };

  const openSignup = () => {
    resetErrors();
    setMode("signup");
    setOpen(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
    }

    if (mode === "signup") {
      if (!firstName.trim()) newErrors.firstName = "Required";
      if (!lastName.trim()) newErrors.lastName = "Required";
      if (!role) newErrors.role = "Pick one";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Wrong credentials");
          } else {
            toast.error(error.message);
          }
        } else {
          setOpen(false);
        }
      } else {
        const { error } = await signUp(email, password, firstName, lastName, role!);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Email taken");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome to RIFF");
          setOpen(false);
        }
      }
    } catch {
      toast.error("Something went wrong");
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
    <div className="min-h-screen w-full flex flex-col overflow-hidden bg-background">
      {/* POSTER HEADER (replace “TASTE TASTE”) */}
      <header className="w-full bg-primary text-primary-foreground">
        <div className="px-6 py-10 md:py-14">
          <div className="font-display leading-[0.9] tracking-tight uppercase">
            <div className="text-[14vw] md:text-[8rem]">RIFF</div>
            <div className="text-[14vw] md:text-[8rem] -mt-2 md:-mt-6">RIFF</div>
          </div>
        </div>
      </header>

      {/* ACTION STRIP (replace artist-name blocks with LOG IN / SIGN UP) */}
      <section className="w-full bg-background border-y border-border">
        <div className="grid grid-cols-2">
          <button
            type="button"
            onClick={openLogin}
            className="py-6 md:py-7 text-center font-display uppercase tracking-widest text-2xl md:text-3xl text-foreground hover:bg-foreground/5 transition"
          >
            LOG IN
          </button>
          <button
            type="button"
            onClick={openSignup}
            className="py-6 md:py-7 text-center font-display uppercase tracking-widest text-2xl md:text-3xl text-foreground hover:bg-foreground/5 transition border-l border-border"
          >
            SIGN UP
          </button>
        </div>
      </section>

      {/* PHOTO AREA (fills remaining space) */}
      <main className="relative flex-1 min-h-0">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${photoUrl})` }}
        />
        {/* subtle darkening so the bands feel like they sit on a poster */}
        <div className="absolute inset-0 bg-background/20" />
      </main>

      {/* MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border p-0">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="font-display uppercase tracking-widest text-2xl">
                {mode === "login" ? "LOG IN" : "SIGN UP"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  {/* Role selection */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {(["artist", "venue", "both"] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`p-3 border transition-all text-center font-display uppercase tracking-widest text-sm ${
                            role === r
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {r === "both" ? "BOTH" : r.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {errors.role && (
                      <p className="text-destructive text-xs">{errors.role}</p>
                    )}
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
                      {errors.firstName && (
                        <p className="text-destructive text-xs mt-1">
                          {errors.firstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last"
                        className="bg-background border-border"
                      />
                      {errors.lastName && (
                        <p className="text-destructive text-xs mt-1">
                          {errors.lastName}
                        </p>
                      )}
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
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-background border-border"
                />
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full font-display uppercase tracking-widest h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? "..." : mode === "login" ? "ENTER" : "JOIN"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );