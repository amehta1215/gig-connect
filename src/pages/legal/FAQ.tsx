import PublicLayout from "@/components/PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is Riff?",
    a: "Riff is a marketplace that connects live music venues with the artists who play them. Venues can post their rooms and browse applicants; artists can find venues and apply directly to play live events.",
  },
  {
    q: "How do I sign up as a venue?",
    a: "Click Sign Up, choose 'Venue' as your role, and add your venue name, location, and rooms. You can start receiving applications as soon as your profile is live.",
  },
  {
    q: "How do I sign up as an artist?",
    a: "Click Sign Up, choose 'Artist' as your role, and build your profile with your genres, past performances, and media. Once complete, you can browse venues and apply to play their rooms.",
  },
  {
    q: "How does the booking process work?",
    a: "Artists apply to a specific room at a venue for a specific date. Venues review applications, place artists on hold for available dates, and confirm bookings once the details are finalized. You can message the other side directly through Riff at every step.",
  },
  {
    q: "What does it cost?",
    a: "Riff is free for early users. If pricing changes down the road, we'll let you know well in advance.",
  },
  {
    q: "Can I message a venue or artist directly?",
    a: "Yes. Once an application has been submitted, both sides can message each other through the Inbox tab. All communication stays in one place, tied to the booking.",
  },
  {
    q: "How do I get support?",
    a: "Reach out through the Contact page or email us directly at hello@riff.com. We aim to respond within one business day.",
  },
];

export default function FAQ() {
  return (
    <PublicLayout tabs={[]}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display uppercase tracking-tight text-3xl md:text-4xl font-black text-primary mb-6">
          Frequently Asked Questions
        </h1>
        <Accordion type="single" collapsible>
          {faqs.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </PublicLayout>
  );
}