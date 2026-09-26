// Phase 7 Slice 5B -- The Trust Project membership facts shown on Home. No second membership number exists:
// the canonical KS Number IS the member's recognisable identity (see TrustProjectSection).

/** What the Home knows about the signed-in person's membership. `null` = not known (signed out, or not read). */
export interface TrustProjectMembershipFact {
  status: 'INVITED' | 'ACTIVE' | 'DECLINED' | 'REVOKED' | null;
  /** The canonical KS Number from the self-scoped `/circle/me` read -- the ONLY membership identity. */
  canonicalKsNumber: string | null;
}

/** "Trust Project member · KS123" -- only for an ACTIVE member whose canonical KS Number is actually known. */
export function membershipLine(fact: TrustProjectMembershipFact | null): string | null {
  if (!fact || fact.status !== 'ACTIVE' || !fact.canonicalKsNumber) return null;
  return `Trust Project member · ${fact.canonicalKsNumber}`;
}
