import { z } from 'zod';

// NOTE: This is CLIENT-SIDE validation only. A determined caller can hit the
// Supabase Auth API directly and bypass it. Also configure the server-side rule
// in the backend auth settings (minimum password length + required character
// classes / special character) so the policy is enforced for real.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/;']/,
    'Password must include at least 1 special character'
  );

export const emailSchema = z.string().email('Invalid email');

export const passwordRules = [
  { label: '8+ characters', test: (v: string) => v.length >= 8 },
  {
    label: '1 special character',
    test: (v: string) => /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/;']/.test(v),
  },
];

export function validatePassword(value: string): string | null {
  const result = passwordSchema.safeParse(value);
  return result.success ? null : result.error.errors[0].message;
}