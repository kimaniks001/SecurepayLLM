/**
 * The only permitted pre-production first-party KS001 origins. This is an
 * environment-consistency guard, NOT proof of backend/data isolation.
 */
export function validateMiniFirstPartyOrigin(raw) {
  if (typeof raw!=='string' || !raw) return null;
  try {
    const url=new URL(raw);
    if (url.protocol!=='https:' || url.port || url.username || url.password ||
      url.pathname!=='/' || url.search || url.hash) return null;
    const host=url.hostname.toLowerCase();
    if (!/^(?:staging|sandbox|qa|test)(?:[-.][a-z0-9-]+)*\.securepay\.ke$/.test(host))
      return null;
    return url.origin;
  } catch {return null;}
}
/**
 * Refuse activation if Mini's normal API source still uses production. Even a
 * matching stage URL still needs separately verified CORS, data/model isolation
 * and staging proxy routing before real human tests.
 */
export function miniFirstPartyOriginsAligned(firstParty,sharedApi) {
  const agent=validateMiniFirstPartyOrigin(firstParty);
  const shared=validateMiniFirstPartyOrigin(sharedApi);
  return agent && shared && agent===shared ? agent : null;
}
