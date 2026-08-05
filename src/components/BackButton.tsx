import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function BackButton() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleClick = () => {
    if (profile?.role === "venue") {
      navigate("/venue");
    } else if (profile?.role === "artist") {
      navigate("/artist/applications");
    } else {
      navigate("/");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="mb-4 -ml-3 text-muted-foreground hover:text-foreground"
      onClick={handleClick}
    >
      <ArrowLeft className="h-4 w-4 mr-1.5" />
      Back to Home
    </Button>
  );
}
