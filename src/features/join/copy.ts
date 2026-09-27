/** Public Experience Convergence Phase 4 -- Join page copy shared with tests. */

/** What joining is NOT, said before anything else. */
export const JOIN_IS_NOT = [
  'create an Agreement',
  'turn on payments, fees, bank accounts or subscriptions',
  'make you a Plug or a Master',
] as const;

export const ACCEPTANCE_LABEL = 'I choose to join The Trust Project under these 12 Principles.';


/**
 * Phase 4C (API ADR-0023) -- the same Join, decided for a Business the person acts for. The person always sees whose
 * membership changes; the Principles and the acceptance are the same canonical ones.
 */
export const businessAcceptanceLabel = (business: string) => `I choose, for ${business}, to join The Trust Project under these 12 Principles.`;
export const businessJoinButton = (business: string) => `Join for ${business}`;
export const NO_LONGER_AUTHORISED = 'You no longer have authority to manage this Business.';
