import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
const emailSchema = z.string().email("Invalid email");
const passwordSchema = z.string().min(6, "Min 6 characters");
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const {
    signIn,
    user,
    profile,
    loading,
    isNewUser,
    clearNewUserFlag
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user && profile) {
      if (isNewUser) {
        // New users go to profile edit page (handles email verification from different device)
        const targetProfile = profile.role === "venue" ? "/venue/profile" : "/artist/profile";
        clearNewUserFlag();
        navigate(targetProfile);
      } else {
        // Existing users go to dashboard
        const targetDashboard = profile.role === "venue" ? "/venue" : "/artist";
        navigate(targetDashboard);
      }
    }
  }, [user, profile, loading, isNewUser, navigate, clearNewUserFlag]);
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
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
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-display text-6xl">RIFF</div>
      </div>;
  }
  return <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
      {/* Form */}
      <div className="w-full max-w-xs bg-primary p-1 md:p-2">
        <div className="bg-background p-6 md:p-8">
          {/* Welcome Back header */}
          <h2 className="font-display uppercase tracking-tight text-2xl md:text-3xl lg:text-4xl font-black text-primary text-center mb-6">
            WELCOME BACK!
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="EMAIL" className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12" />
              {errors.email && <p className="text-accent text-xs mt-1 font-display">{errors.email}</p>}
            </div>

            <div>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="PASSWORD" className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12" />
              {errors.password && <p className="text-accent text-xs mt-1 font-display">{errors.password}</p>}
            </div>

            {/* Forgot password link */}
            <p className="text-right text-sm">
              <Link to="/forgot-password" className="text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </p>

              <button type="submit" className="w-full h-12 font-display uppercase tracking-widest text-lg bg-primary text-background hover:bg-primary/90 transition-colors" disabled={isLoading}>
                {isLoading ? "..." : "LOGIN"}
              </button>
            </form>

          {/* Sign up link */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>;
}