import ReactMarkdown from "react-markdown";
import privacyPolicy from "@/content/privacy-policy.md?raw";

export default function PrivacyPolicyContent() {
  return (
    <div className="text-sm text-muted-foreground leading-relaxed space-y-4 break-words">
      <ReactMarkdown components={{
        h1: ({ children }) => <h2 className="font-display text-xl font-bold text-foreground">{children}</h2>,
        h2: ({ children }) => <h3 className="text-lg font-semibold text-foreground pt-4">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-6 space-y-1">{children}</ul>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        a: ({ href, children }) => <a href={href} className="underline underline-offset-2 text-foreground hover:text-primary">{children}</a>,
      }}>{privacyPolicy}</ReactMarkdown>
    </div>
  );
}