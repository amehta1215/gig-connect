import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";

type AuthMode = "login" | "signup" | null;
type UserRole = "artist" | "venue" | "both";

const emailSchema = z.string().email("Invalid email");
const passwordSchema = z.string().min(6, "Min 6 characters");

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>(null);

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

  // Redirect after auth/profile is available
  useEffect(() => {
    if (!loading && user && profile) {
      const targetDashboard = profile.role === "venue" ? "/venue" : "/artist";
      navigate(targetDashboard);
    }
  }, [user, profile, loading, navigate]);

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
        }
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, firstName, lastName, role!);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Email taken");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome to RIFF");
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (newMode: AuthMode) => {
    if (mode === newMode) {
      setMode(null);
    } else {
      setMode(newMode);
      setErrors({});
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
    <div className="min-h-screen w-full flex flex-col bg-background">
      {/* Giant RIFF title - takes up ~50% of viewport */}
      <header className="px-4 md:px-8 pt-4 md:pt-6 flex items-center min-h-[50vh]">
        <h1 className="font-display text-primary leading-[0.75] text-[42vw] md:text-[35vw] tracking-tighter font-black">
          RIFF
        </h1>
      </header>

      {/* Auth buttons row */}
      <section className="px-4 md:px-8 mt-4">
        <div className="flex gap-8 md:gap-16">
          {/* SIGN UP button */}
          <button
            type="button"
            onClick={() => toggleMode("signup")}
            className={`font-display uppercase tracking-wide text-2xl md:text-4xl transition-colors ${
              mode === "signup" ? "text-accent" : "text-primary"
            }`}
          >
            SIGN UP
          </button>

          {/* LOG IN button */}
          <button
            type="button"
            onClick={() => toggleMode("login")}
            className={`font-display uppercase tracking-wide text-2xl md:text-4xl transition-colors ${
              mode === "login" ? "text-accent" : "text-primary"
            }`}
          >
            LOG IN
          </button>
        </div>
      </section>

      {/* Unrolling form panels */}
      <main className="flex-1 px-4 md:px-8 mt-4 pb-8">
        <div className="flex gap-8 md:gap-16">
          {/* SIGN UP Panel */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              mode === "signup" ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
            style={{ width: mode === "signup" ? "100%" : "auto", maxWidth: "400px" }}
          >
            <div className="bg-primary p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Role selection */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {(["artist", "venue", "both"] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`p-3 text-center font-display uppercase tracking-widest text-sm md:text-base transition-colors ${
                          role === r
                            ? "bg-background text-primary"
                            : "bg-primary text-background border border-background"
                        }`}
                      >
                        {r === "both" ? "BOTH" : r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {errors.role && <p className="text-accent text-xs font-display">{errors.role}</p>}
                </div>

                {/* Name */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="FIRST"
                      className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                    />
                    {errors.firstName && <p className="text-accent text-xs mt-1 font-display">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="LAST"
                      className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                    />
                    {errors.lastName && <p className="text-accent text-xs mt-1 font-display">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="EMAIL"
                    className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                  />
                  {errors.email && <p className="text-accent text-xs mt-1 font-display">{errors.email}</p>}
                </div>

                <div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="PASSWORD"
                    className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                  />
                  {errors.password && <p className="text-accent text-xs mt-1 font-display">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full h-12 font-display uppercase tracking-widest text-lg bg-background text-primary hover:bg-secondary transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "JOIN"}
                </button>
              </form>
            </div>
          </div>

          {/* LOG IN Panel */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              mode === "login" ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
            }`}
            style={{ width: mode === "login" ? "100%" : "auto", maxWidth: "400px" }}
          >
            <div className="bg-primary p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="EMAIL"
                    className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                  />
                  {errors.email && <p className="text-accent text-xs mt-1 font-display">{errors.email}</p>}
                </div>

                <div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="PASSWORD"
                    className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                  />
                  {errors.password && <p className="text-accent text-xs mt-1 font-display">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full h-12 font-display uppercase tracking-widest text-lg bg-background text-primary hover:bg-secondary transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "ENTER"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
