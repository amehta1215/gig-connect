import { passwordRules } from '@/lib/validation';
import { Check, X } from 'lucide-react';

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {passwordRules.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-2 text-xs font-display ${
              ok ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}