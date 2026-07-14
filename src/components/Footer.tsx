import { Link } from "react-router-dom";

export default function Footer() {
  const linkClass =
    "text-sm text-muted-foreground hover:text-foreground transition-colors block mb-2";
  const headerClass =
    "font-display uppercase tracking-wider text-sm text-foreground mb-4";

  return (
    <footer className="w-full bg-muted">
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className={headerClass}>Support</h3>
            <Link to="/faq" className={linkClass}>
              FAQ
            </Link>
            <Link to="/contact" className={linkClass}>
              Contact
            </Link>
          </div>
          <div>
            <h3 className={headerClass}>Riff</h3>
            <Link to="/about" className={linkClass}>
              About
            </Link>
            <Link to="/legal" className={linkClass}>
              Privacy & Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
