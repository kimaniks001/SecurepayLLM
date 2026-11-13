/** A descriptive, non-authoritative projection of SecurePayAPI truth. */
export interface MiniCapabilityView {
  readonly code: string;
  readonly exposure: 'KNOW_EXPLAIN' | 'SUGGEST' | 'READ' | 'INITIATE_EXPLICIT_USER_FLOW';
  readonly eligibility: 'UNKNOWN' | 'NOT_REQUIRED' | 'ELIGIBLE' | 'INELIGIBLE';
  readonly limited: boolean;
  readonly humanBenefit: string;
  readonly limitations: readonly string[];
}
export interface MiniCapabilityCatalogueView {
  readonly registryVersion: string;
  readonly interactionMode: 'FORMATION' | 'LIVE_AGREEMENT';
  readonly capabilities: readonly MiniCapabilityView[];
}
export function miniCapabilityCatalogue(raw: unknown): MiniCapabilityCatalogueView | null;
