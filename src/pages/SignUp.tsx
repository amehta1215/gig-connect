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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signUp, user, profile, loading } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen w-full flex flex-col bg-background">
      {/* Giant RIFF title */}
      <header className="relative h-[50vh] overflow-hidden">
        <h1 className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-display text-primary leading-none text-[min(64vw,50vh)] tracking-[-0.06em] font-black">
          RIFF
        </h1>
      </header>

      {/* Sign up section */}
      <section className="flex-1 flex flex-col px-4 md:px-8 pb-8">
        {/* SIGN UP header */}
        <div className="bg-primary py-6 md:py-8 text-center">
          <h2 className="font-display uppercase tracking-tight text-4xl md:text-6xl lg:text-7xl font-black text-background">
            SIGN UP
          </h2>
        </div>

        {/* Form */}
        <div className="mt-6 bg-primary p-1 md:p-2">
          <div className="bg-background p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
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
                {errors.role && (
                  <p className="text-accent text-xs font-display">{errors.role}</p>
                )}
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
                  {errors.firstName && (
                    <p className="text-accent text-xs mt-1 font-display">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="LAST"
                    className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                  />
                  {errors.lastName && (
                    <p className="text-accent text-xs mt-1 font-display">{errors.lastName}</p>
                  )}
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
                {errors.email && (
                  <p className="text-accent text-xs mt-1 font-display">{errors.email}</p>
                )}
              </div>

              <div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="PASSWORD"
                  className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                />
                {errors.password && (
                  <p className="text-accent text-xs mt-1 font-display">{errors.password}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full h-12 font-display uppercase tracking-widest text-lg bg-primary text-background hover:bg-primary/90 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "..." : "JOIN"}
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
      </section>
    </div>
  );
}
