import BackButton from "@/components/BackButton";
import PublicLayout from "@/components/PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TermsOfServiceContent from "@/components/TermsOfServiceContent";
import PrivacyPolicyContent from "@/components/PrivacyPolicyContent";

export default function Legal() {
  return (
    <PublicLayout tabs={[]}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <BackButton />
        <h1 className="font-display uppercase tracking-tight text-3xl md:text-4xl font-black text-primary mb-6">
          Privacy & Terms
        </h1>
        <Accordion type="single" collapsible>
          <AccordionItem value="privacy">
            <AccordionTrigger className="text-left">Privacy Policy</AccordionTrigger>
            <AccordionContent>
              <PrivacyPolicyContent />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="terms">
            <AccordionTrigger className="text-left">Terms of Service</AccordionTrigger>
            <AccordionContent>
              <TermsOfServiceContent />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </PublicLayout>
  );
}