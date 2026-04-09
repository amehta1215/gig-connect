import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthDialog from "@/components/AuthDialog";

export default function Login() {
  const { user, profile, loading, isNewUser, clearNewUserFlag } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      if (isNewUser) {
        const targetProfile = profile.role === "venue" ? "/venue/profile" : "/artist/profile";
        clearNewUserFlag();
        navigate(targetProfile);
      } else {
        const targetDashboard = profile.role === "venue" ? "/venue" : "/artist";
        navigate(targetDashboard);
      }
    }
  }, [user, profile, loading, isNewUser, navigate, clearNewUserFlag]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-display text-6xl">RIFF</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthDialog
        open={true}
        onOpenChange={() => navigate("/")}
        defaultMode="login"
      />
    </div>
  );
}
