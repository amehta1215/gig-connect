import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success("Check your email for the reset link");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
      {/* Header */}
      <div className="py-4 md:py-5 text-center">
        <h2 className="font-display uppercase tracking-tight text-2xl md:text-3xl lg:text-4xl font-black text-primary">
          RESET PASSWORD
        </h2>
      </div>

      {/* Form */}
      <div className="w-full max-w-xs bg-primary p-1 md:p-2">
        <div className="bg-background p-6 md:p-8">
          {emailSent ? (
            <div className="text-center space-y-4">
              <p className="text-foreground font-display">
                Check your email for a password reset link.
              </p>
              <Link
                to="/login"
                className="block text-primary hover:underline font-medium text-sm"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="EMAIL"
                    className="bg-background text-foreground placeholder:text-muted-foreground border-0 font-display text-lg h-12"
                  />
                  {error && (
                    <p className="text-accent text-xs mt-1 font-display">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full h-12 font-display uppercase tracking-widest text-lg bg-primary text-background hover:bg-primary/90 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "SEND RESET LINK"}
                </button>
              </form>

              {/* Back to login link */}
              <p className="text-center mt-6 text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
