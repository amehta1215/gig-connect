import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 text-center space-y-6">
        <h1 className="font-display text-5xl tracking-wide text-accent">404</h1>
        <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
          Page Not Found
        </h2>
        <p className="text-muted-foreground font-display text-sm leading-relaxed">
          We couldn't find that page. It may have been moved or the link might be out of date.
          Try reloading, or head back home.
        </p>
        <Link
          to="/"
          className="block w-full h-12 leading-[3rem] font-display uppercase tracking-widest text-lg text-accent-foreground bg-accent hover:bg-accent/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
