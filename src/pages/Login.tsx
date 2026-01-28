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

  const { signIn, user, profile, loading } = useAuth();
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-display text-6xl">RIFF</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      {/* Giant RIFF title */}
      <header className="relative h-[40vh] overflow-hidden">
        <h1 className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-display text-primary leading-none text-[min(64vw,40vh)] tracking-[-0.06em] font-black">
          RIFF
        </h1>
      </header>

      {/* Login section */}
      <section className="flex-1 flex flex-col px-4 md:px-8">
        <div className="max-w-md mx-auto w-full">
          {/* LOG IN header */}
          <div className="bg-primary py-6 md:py-8 text-center">
            <h2 className="font-display uppercase tracking-tight text-4xl md:text-6xl font-black text-background">
              LOG IN
            </h2>
          </div>

          {/* Form */}
          <div className="bg-primary p-1 md:p-2">
            <div className="bg-background p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  {isLoading ? "..." : "ENTER"}
                </button>
              </form>

              {/* Create account link */}
              <div className="mt-6 text-center">
                <Link
                  to="/signup"
                  className="font-display uppercase tracking-widest text-primary hover:text-primary/80 transition-colors text-lg"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
