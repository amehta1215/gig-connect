import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
type AuthMode = "login" | "signup";
type UserRole = "artist" | "venue" | "both";
const emailSchema = z.string().email("Invalid email");
const passwordSchema = z.string().min(6, "Min 6 characters");
export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const {
    signIn,
    signUp,
    user,
    profile,
    loading
  } = useAuth();
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
        const {
          error
        } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Wrong credentials");
          } else {
            toast.error(error.message);
          }
        }
      } else {
        const {
          error
        } = await signUp(email, password, firstName, lastName, role!);
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
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-pulse text-primary font-display text-6xl">RIFF</div>
      </div>;
  }
  return <div className="min-h-screen w-full flex flex-col bg-black text-foreground">
      {/* Poster title (stacked) */}
      <header className="px-6 pt-8 md:pt-10">
        <div className="font-display uppercase tracking-tight leading-[0.82] text-primary">
          <div className="text-[20vw] md:text-[11rem]">RIFF</div>
          <div className="text-[20vw] md:text-[11rem] -mt-4 md:-mt-8">RIFF</div>
        </div>
      </header>

      {/* Sign in / Log in strip */}
      <section className="px-6">
        <div className="grid grid-cols-2 border border-black font-sans text-9xl font-extrabold text-right">
          <button type="button" onClick={() => {
          setErrors({});
          setMode("signup");
        }} className={["font-display uppercase tracking-widest text-2xl md:text-3xl py-5 md:py-6", "transition-none border-r border-black", mode === "signup" ? "bg-black text-primary" : "bg-primary text-black"].join(" ")}>
            SIGN IN
          </button>

          <button type="button" onClick={() => {
          setErrors({});
          setMode("login");
        }} className={["font-display uppercase tracking-widest text-2xl md:text-3xl py-5 md:py-6", "transition-none", mode === "login" ? "bg-black text-primary" : "bg-primary text-black"].join(" ")}>
            LOG IN
          </button>
        </div>
      </section>

      {/* Panels (show under the selected half) */}
      <main className="flex-1 px-6 pb-10 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 h-full">
          {/* LEFT: SIGNUP PANEL */}
          <div className="md:pr-3">
            {mode === "signup" && <div className="bg-primary text-black border border-black p-6 md:p-8 min-h-[420px]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Role selection */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {(["artist", "venue", "both"] as UserRole[]).map(r => <button key={r} type="button" onClick={() => setRole(r)} className={`p-3 border border-black text-center font-display uppercase tracking-widest text-sm md:text-base ${role === r ? "bg-black text-primary" : "bg-primary text-black"}`}>
                          {r === "both" ? "BOTH" : r.toUpperCase()}
                        </button>)}
                    </div>
                    {errors.role && <p className="text-black/80 text-xs font-medium">{errors.role}</p>}
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" className="bg-black text-white placeholder:text-white/50 border-black focus-visible:ring-0 focus-visible:ring-offset-0" />
                      {errors.firstName && <p className="text-black/80 text-xs mt-1 font-medium">{errors.firstName}</p>}
                    </div>
                    <div>
                      <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" className="bg-black text-white placeholder:text-white/50 border-black focus-visible:ring-0 focus-visible:ring-offset-0" />
                      {errors.lastName && <p className="text-black/80 text-xs mt-1 font-medium">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="bg-black text-white placeholder:text-white/50 border-black focus-visible:ring-0 focus-visible:ring-offset-0" />
                    {errors.email && <p className="text-black/80 text-xs mt-1 font-medium">{errors.email}</p>}
                  </div>

                  <div>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="bg-black text-white placeholder:text-white/50 border-black focus-visible:ring-0 focus-visible:ring-offset-0" />
                    {errors.password && <p className="text-black/80 text-xs mt-1 font-medium">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full h-12 font-display uppercase tracking-widest text-lg bg-black text-primary hover:bg-black/90" disabled={isLoading}>
                    {isLoading ? "..." : "JOIN"}
                  </Button>
                </form>
              </div>}
          </div>

          {/* RIGHT: LOGIN PANEL */}
          <div className="md:pl-3">
            {mode === "login" && <div className="bg-primary text-black border border-black p-6 md:p-8 min-h-[420px]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="bg-black text-white placeholder:text-white/50 border-black focus-visible:ring-0 focus-visible:ring-offset-0" />
                    {errors.email && <p className="text-black/80 text-xs mt-1 font-medium">{errors.email}</p>}
                  </div>

                  <div>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="bg-black text-white placeholder:text-white/50 border-black focus-visible:ring-0 focus-visible:ring-offset-0" />
                    {errors.password && <p className="text-black/80 text-xs mt-1 font-medium">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full h-12 font-display uppercase tracking-widest text-lg bg-black text-primary hover:bg-black/90" disabled={isLoading}>
                    {isLoading ? "..." : "ENTER"}
                  </Button>
                </form>
              </div>}
          </div>
        </div>
      </main>
    </div>;
}