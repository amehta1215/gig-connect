import { Link } from 'react-router-dom';

export default function AccountDeleted() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 text-center space-y-4">
        <h1 className="font-display text-3xl tracking-wide text-foreground">
          ACCOUNT DELETED
        </h1>
        <p className="text-muted-foreground font-display">
          Your account and all associated data have been permanently removed.
        </p>
        <Link
          to="/"
          className="inline-block text-accent hover:underline font-display text-sm uppercase tracking-widest"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}