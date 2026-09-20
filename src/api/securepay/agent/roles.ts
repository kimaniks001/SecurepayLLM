/**
 * Role words the UI may offer, each mapped to the canonical role the BACKEND actually produces.
 *
 * Mirrors `RoleVocabulary` (SecurePayAPI agent/tradecontext). Identical LABELS do not imply identical
 * backend SEMANTICS: the vocabulary is a closed map of single words; anything else becomes `OTHER`
 * with the original text kept as a descriptor. In particular "service provider" is NOT in it
 * (it would be `OTHER`), whereas contractor / supplier / vendor / fundi / mason ... map to
 * `SERVICE_PROVIDER`. So the UI offers only words whose canonical outcome is known, and the
 * read-back check compares the canonical role, never the label.
 */
export const ROLE_CANONICAL: Readonly<Record<string, string>> = {
  seller: 'SELLER', buyer: 'BUYER', landlord: 'LANDLORD', tenant: 'TENANT', organizer: 'ORGANIZER',
  lender: 'LENDER', borrower: 'BORROWER', recipient: 'RECIPIENT', counterparty: 'COUNTERPARTY',
  client: 'CLIENT', contractor: 'SERVICE_PROVIDER', supplier: 'SERVICE_PROVIDER',
};
export const KNOWN_ROLES = Object.keys(ROLE_CANONICAL) as readonly string[];
export const canonicalRole = (word: string): string | null => ROLE_CANONICAL[word.trim().toLowerCase()] ?? null;
