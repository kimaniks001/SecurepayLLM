/**
 * Day 11 Agreement Commerce — common vocabulary and safety decisions.
 * This module describes the SAME journey in the Living Workspace, seller Store,
 * Ask KS001, and compact Mini. It does not supply agreement, identity, inventory,
 * capacity, matching, funding, payment or settlement authority.
 */
export const COMMERCE_EXPERIENCE = Object.freeze({
  promise: 'Agree · Deliver · Grow',
  shop: 'Find goods and services. Agree on the details before you commit.',
  seller: 'Your offers, agreements, commitments and opportunities in one place.',
  assistant: 'KS001 helps you understand offers, prepare agreements and organise fulfilment.',
  mini: 'Review the offer and agreement. Choose a payment method only when authorised.',
  sourceOnly: 'Published offer only · Not an accepted agreement or reserved order',
  notShared: 'Your agreements and customer details stay private unless sharing is specifically authorised.',
  funding: 'Financial status comes from the authorised provider. SecurePay never assumes money has moved.',
  saver: 'Community Saver connects voluntarily shared commercial opportunities, not private agreements.',
});

/** Agreement execution and financial status are separate authorities.
 * Unverified evidence must never become an assertion of funding or completion.
 */
export type ExecutionStage =
  | 'UNVERIFIED'
  | 'OFFER'
  | 'AGREED'
  | 'EXECUTING'
  | 'AWAITING_ACCEPTANCE'
  | 'COMPLETED';

export type FinancialStage = 'UNKNOWN' | 'VERIFIED_FUNDED' | 'VERIFIED_SETTLED';

export function describeCommerceStatus(stage: ExecutionStage, financial: FinancialStage) {
  const states: Record<ExecutionStage, {label:string; nextAction:string}> = {
    UNVERIFIED: {label:'Status needs verification',nextAction:'Check the authoritative agreement'},
    OFFER: {label:'Offer available for review',nextAction:'Review the offer and agree terms'},
    AGREED: {label:'Agreement accepted',nextAction:'Check the agreed start conditions'},
    EXECUTING: {label:'Work in progress',nextAction:'Review the next obligation'},
    AWAITING_ACCEPTANCE: {label:'Awaiting acceptance',nextAction:'Review completion evidence'},
    COMPLETED: {label:'Work accepted',nextAction:'Check settlement conditions'},
  };
  const safeStage = states[stage] ? stage : 'UNVERIFIED';
  return {
    ...states[safeStage],
    fundingLabel: financial === 'VERIFIED_FUNDED'
      ? 'Funding verified by provider'
      : financial === 'VERIFIED_SETTLED'
        ? 'Settlement verified by provider'
        : 'Financial status not verified',
  };
}

/** Default-deny sharing: ordinary membership does not authorise disclosure of a
 * customer's agreement. Sensitive providers still require separate vetting.
 */
export function canShareCommunitySignal(input: {
  participates?: boolean;
  categoryApproved?: boolean;
  signalSelected?: boolean;
  audienceSelected?: boolean;
  agreementSpecificPermission?: boolean;
  derivedFromPrivateAgreement?: boolean;
}) {
  if (!input.participates || !input.categoryApproved ||
      !input.signalSelected || !input.audienceSelected) return false;
  if (input.derivedFromPrivateAgreement && !input.agreementSpecificPermission) return false;
  return true;
}

/** Reciprocal viewer receipts: both members must expressly opt in. */
export function canRevealViewer(input: {myReceipts?:boolean; theirReceipts?:boolean}) {
  return input.myReceipts === true && input.theirReceipts === true;
}
