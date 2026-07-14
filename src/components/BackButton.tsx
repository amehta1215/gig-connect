import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="mb-4 -ml-3 text-muted-foreground hover:text-foreground"
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className="h-4 w-4 mr-1.5" />
      Back
    </Button>
  );
}
