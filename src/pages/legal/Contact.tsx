import BackButton from "@/components/BackButton";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function Contact() {
  return (
    <PublicLayout tabs={[]}>
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-left">
          <BackButton />
        </div>
        <h1 className="font-display uppercase tracking-tight text-3xl md:text-4xl font-black text-primary mb-6">
          Contact Us
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed mb-10 max-w-md mx-auto">
          Have a question, some feedback, or want to say hi? Send us an email at{" "}
          <a
            href="mailto:hello@riff.com"
            className="text-primary hover:underline font-medium"
          >
            hello@riff.com
          </a>{" "}
          and we'll get back to you within one business day.
        </p>
        <div className="flex justify-center">
          <a href="mailto:hello@riff.com">
            <Button variant="outline" size="lg">
              <Mail className="h-4 w-4 mr-2" />
              hello@riff.com
            </Button>
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}