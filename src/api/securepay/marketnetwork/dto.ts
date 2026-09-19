// Verified against kimaniks001/SecurePayAPI feat/securepay-phase11-referrals-plugs-masters @
// 978437f300244119302607ba3e656a76253190bb (PlugMarketEntryController.java,
// CustomerPlugRelationshipLifecycleController.java, CustomerMarketRequestRepository.java,
// CustomerPlugRelationshipRepository.java). Every method/record here is byte-identical to `origin/main`
// (confirmed by direct diff) — this is real, live backend authority today, not gated on any open PR.
//
// This file exposes only the CUSTOMER side of the Plug matching flow (task doctrine section 6/7: Plugs
// introduce/navigate, they gain no Agreement/Money authority). The Plug-side "become a Plug"/opportunity
// flow (`/plug/entry`, `/plug/exit`, `/plug/me`, `/plug/relationships`, `/opportunities/**`) has no Bolt
// surface to wire and is deliberately not included.

export type CustomerMarketRequestType = 'GENERAL_SECUREPAY_HELP' | 'PROPERTY_JOURNEY_HELP';
export type CustomerMarketRequestStatus = 'OPEN' | 'SELECTED' | 'CANCELLED';
/** v1: exactly one value. The relationship binding itself never expires/revokes once opened. */
export type CustomerPlugRelationshipStatus = 'ACTIVE';

export interface CustomerMarketRequestBody { requestType: string }
export interface CustomerMarketSelectionBody { candidateRef: string }

export interface CustomerMarketRequestResponse {
  requestId: string;
  requestType: string;
  status: string;
  offerId: string | null;
  title: string | null;
  summary: string | null;
  requiredProgramCode: string | null;
  interestedCount: number;
  createdAt: string;
  cancelledAt: string | null;
}

export interface InterestedCandidateResponse {
  candidateRef: string;
  interestedAt: string;
}

export interface CustomerMarketSelectionResponse {
  selectionRef: string;
  requestId: string;
  candidateRef: string;
  selectedAt: string;
}

export interface CustomerPlugRelationshipResponse {
  relationshipRef: string;
  requestId: string;
  requestType: string;
  status: string;
  openedAt: string;
  contactExchangeAvailable: boolean;
}

export interface RelationshipLifecycleResponse {
  relationshipRef: string;
  requestId: string;
  requestType: string;
  status: string;
  openedAt: string;
  requesterHandoffConsented: boolean;
  plugHandoffConsented: boolean;
  handoffReady: boolean;
  contactExchangeAvailable: boolean;
  terminalAt: string | null;
}
