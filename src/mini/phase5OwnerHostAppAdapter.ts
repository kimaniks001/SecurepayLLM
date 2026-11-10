/**
 * Phase 5 Gate 3 — first actual Store app host entry to the shared owner
 * checkout simulator. This does NOT issue a real order or transmit an offer.
 *
 * Source of the sample reference, price, merchant and terms is always the
 * registered SAME-ORIGIN Phase 5 test host and its signing endpoint.
 * Never use this URL as proof of a payment or as a buyer handoff token.
 */
export const MINI_PHASE5_OWNER_TEST_ORIGIN =
  'https://securepay-e0dkcl10i-james-8078.vercel.app' as const;

export function phase5OwnerHostTestLink(
  source:'STORE'|'SHORTSTAYS',
  ownerPreviewFlag:unknown
):string|null {
  if(ownerPreviewFlag!=='phase5-gate3-owner-test')return null;
  if(source==='STORE')return MINI_PHASE5_OWNER_TEST_ORIGIN+'/phase5-store-host.html';
  if(source==='SHORTSTAYS')return MINI_PHASE5_OWNER_TEST_ORIGIN+'/phase5-shortstays-host.html';
  return null;
}
