import PublicLayout from "@/components/PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const privacyParagraphs = [
  "Riff takes your privacy seriously. This is a placeholder version of our privacy policy — before public launch, we will replace it with a lawyer-reviewed version.",
  "What we collect: When you use Riff, we collect the information you provide directly — your name, email address, profile details (venue information, artist bio, genres, media), application content, messages between users, and calendar data. We also collect basic technical information such as your IP address, browser type, and pages visited, so we can keep the platform running smoothly.",
  "How we use it: Your information powers the core functions of Riff — matching artists with venues, delivering messages, showing you relevant venues or artists, and improving how the platform works. We do not sell your data to third parties. We do not share your data with anyone except the counterparty in a booking (venues see artist applications; artists see venue profiles).",
  "Your rights: You can update or delete your account at any time through your profile settings. If you have questions about your data or want a copy of it, email hello@riff.com.",
];

const termsParagraphs = [
  "By using Riff, you agree to these terms. This is a placeholder version of our terms of service — before public launch, we will replace it with a lawyer-reviewed version.",
  "Acceptable use: Riff is a good-faith marketplace. Users agree to represent themselves truthfully, honor bookings they confirm, communicate respectfully, and comply with all applicable laws. We reserve the right to remove accounts that violate these terms or that we determine, in our sole discretion, harm the platform or its users.",
  "Bookings and payments: Riff facilitates connections between artists and venues but is not a party to any booking agreement between them. All bookings, payments, and performance obligations are between the artist and the venue directly. Riff is not responsible for cancellations, no-shows, payment disputes, or the quality of any performance.",
  "Limitation of liability: Riff is provided 'as is.' We do our best to keep the platform running smoothly, but we cannot guarantee uninterrupted service. To the fullest extent permitted by law, Riff is not liable for any indirect, incidental, or consequential damages arising from your use of the platform.",
  "Changes: We may update these terms as Riff evolves. If we make significant changes, we'll notify users through the platform or by email.",
];

export default function Legal() {
  return (
    <PublicLayout tabs={[]}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display uppercase tracking-tight text-3xl md:text-4xl font-black text-primary mb-6">
          Privacy & Terms
        </h1>
        <Accordion type="single" collapsible>
          <AccordionItem value="privacy">
            <AccordionTrigger className="text-left">Privacy Policy</AccordionTrigger>
            <AccordionContent>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
                {privacyParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="terms">
            <AccordionTrigger className="text-left">Terms of Service</AccordionTrigger>
            <AccordionContent>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
                {termsParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </PublicLayout>
  );
}