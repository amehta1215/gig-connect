// Deliberate email confirmation/recovery links are not ordinary website visits.
export function isAuthEmailLink(url: string): boolean {
  const location = new URL(url);
  const hash = new URLSearchParams(location.hash.slice(1));
  return Boolean(hash.get('access_token')) &&
    (hash.get('type') === 'signup' || hash.get('type') === 'recovery');
}

export function canUseVisitSession(explicitSignIn: boolean, emailLink: boolean): boolean {
  return explicitSignIn || emailLink;
}