import { companyInformation } from '@/lib/booker';

interface ManagedByProps {
  profile?: { is_booker?: boolean; show_company_info?: boolean; venue_name?: string | null; bio?: string | null } | null;
}

export function ManagedBy({ profile }: ManagedByProps) {
  const company = companyInformation(profile);
  if (!company) return null;
  return <section className="space-y-2 py-4">
    <h2 className="font-sans text-base font-semibold text-foreground break-words">Managed by {company.name}</h2>
    {company.bio && <p className="text-sm text-foreground whitespace-pre-line break-words">{company.bio}</p>}
  </section>;
}