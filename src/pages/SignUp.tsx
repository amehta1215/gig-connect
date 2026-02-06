import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
type UserRole = "artist" | "venue" | "both";
const emailSchema = z.string().email("Invalid email");
const passwordSchema = z.string().min(6, "Min 6 characters");
export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const {
    signUp,
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
        // New users go to profile edit page
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
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    if (!firstName.trim()) newErrors.firstName = "Required";
    if (!lastName.trim()) newErrors.lastName = "Required";
    if (!role) newErrors.role = "Pick one";
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
      } = await signUp(email, password, firstName, lastName, role!);
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Email taken");
        } else {
          toast.error(error.message);
        }
      } else {
        setEmailSent(true);
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

  // Show confirmation message after signup
  if (emailSent) {
    return <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-xs bg-primary p-1 md:p-2">
          <div className="bg-background p-6 md:p-8 text-center">
            <h2 className="font-display uppercase tracking-tight text-2xl md:text-3xl font-black text-primary mb-4">
              CHECK YOUR EMAIL
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              We sent a verification link to <span className="text-primary font-medium">{email}</span>. Click the link to activate your account.
            </p>
            <Link to="/login" className="text-primary hover:underline font-display text-sm uppercase tracking-widest">
              Back to Login
            </Link>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
      {/* Form */}
      <div className="w-full max-w-xs bg-primary p-1 md:p-2">
        <div className="bg-background p-6 md:p-8">
          {/* Sign Up header */}
          <h2 className="font-display uppercase tracking-tight text-2xl md:text-3xl lg:text-4xl font-black text-primary text-center mb-6">SIGN UP</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {(["artist", "venue", "both"] as UserRole[]).map(r => <button key={r} type="button" onClick={() => setRole(r)} className={`p-2 text-center font-display uppercase tracking-widest text-xs transition-colors ${role === r ? "bg-background text-primary" : "bg-primary text-background border border-background"}`}>
                    {r === "both" ? "BOTH" : r.toUpperCase()}
                  </button>)}
              </div>
              {errors.role && <p className="text-accent text-xs font-display">{errors.role}</p>}
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="FIRST" className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12" />
                {errors.firstName && <p className="text-accent text-xs mt-1 font-display">{errors.firstName}</p>}
              </div>
              <div>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="LAST" className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12" />
                {errors.lastName && <p className="text-accent text-xs mt-1 font-display">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="EMAIL" className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12" />
              {errors.email && <p className="text-accent text-xs mt-1 font-display">{errors.email}</p>}
            </div>

            <div>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="PASSWORD" className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12" />
              {errors.password && <p className="text-accent text-xs mt-1 font-display">{errors.password}</p>}
            </div>

            <div>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="CONFIRM PASSWORD" className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12" />
              {errors.confirmPassword && <p className="text-accent text-xs mt-1 font-display">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" className="w-full h-12 font-display uppercase tracking-widest text-lg text-background transition-colors bg-accent" disabled={isLoading}>
              {isLoading ? "..." : "SIGN UP"}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>;
}