import BackButton from "@/components/BackButton";
import PublicLayout from "@/components/PublicLayout";

export default function About() {
  return (
    <PublicLayout tabs={[]}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <BackButton />
        <h1 className="font-display uppercase tracking-tight text-3xl md:text-4xl font-black text-primary mb-6">
          About Riff
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          Riff is a marketplace built for the people who make live music happen. We connect independent artists and venues so they can find each other, book shows, and manage the logistics of live events — all in one place. No email chains, no shared spreadsheets, no missed opportunities.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          Based in New York City, Riff grew out of a love for live music and the belief that booking should be as simple as showing up. Whether you're a room looking for your next weekend act or an artist looking for your next stage, Riff is where the two sides meet.
        </p>
      </div>
    </PublicLayout>
  );
}