/**
 * Mini Collect C2 — strictly local, non-authoritative policy preparation.
 * The backend and regulated provider must independently verify identity,
 * acceptance, version, accounts, capabilities, consent, money and refunds.
 */
export const COLLECTION_KINDS = Object.freeze(['buy', 'paid', 'regular', 'group', 'give', 'goal']);
export const ACTOR_CAPACITIES = Object.freeze([
  { id: 'self', label: 'I am collecting for myself', hint: 'Your own verified trade or responsibility' },
  { id: 'organization', label: 'For an organization', hint: 'The organization must authorize you' },
  { id: 'representative', label: 'For someone else', hint: 'You must show permission to act for them' },
]);
export const CONTRIBUTOR_SCOPES = Object.freeze([
  { id: 'one', label: 'One person or customer', hint: 'An identifiable obligation or contribution' },
  { id: 'invited', label: 'Specific invited people', hint: 'Only approved participants may contribute' },
  { id: 'open', label: 'Anyone eligible to contribute', hint: 'A publicly shared invitation with clear conditions' },
]);
const BENEFICIARY_RULES = Object.freeze({
  buy: [
    { id: 'merchant', label: 'The verified store or seller', hint: 'Keep the exact item, seller and offer version' },
  ],
  paid: [
    { id: 'collector', label: 'My verified receiving account', hint: 'Only if I am the lawful payee' },
    { id: 'organization', label: 'An authorized business or school', hint: 'The business must verify receiving rights' },
  ],
  regular: [
    { id: 'collector', label: 'The verified service provider', hint: 'Based on the recurring obligation' },
    { id: 'organization', label: 'An authorized organization', hint: 'For dues, fees or subscriptions' },
  ],
  group: [
    { id: 'rotation', label: 'A member in the agreed rotation', hint: 'The member and order must be accepted' },
    { id: 'merchant', label: 'A verified provider for our project', hint: 'Payment follows the approved group purpose' },
  ],
  give: [
    { id: 'organization', label: 'A verified church or organization', hint: 'Respect each contribution’s designated purpose' },
    { id: 'named-person', label: 'A named person or cause', hint: 'Establish authority and conditional giving rights' },
  ],
  goal: [
    { id: 'education', label: 'A verified school or education provider', hint: 'Tie disbursement to actual approved fees' },
    { id: 'organization', label: 'A designated beneficiary or group', hint: 'Apply its accepted saving and payout rules' },
  ],
});
export function beneficiaryOptions(kind) {
  return Object.prototype.hasOwnProperty.call(BENEFICIARY_RULES, kind) ? BENEFICIARY_RULES[kind] : [];
}
export const TARGET_MODES = Object.freeze([
  { id: 'fixed', label: 'A specific amount', hint: 'We know the target' },
  { id: 'open', label: 'No fixed amount', hint: 'A timed collection or ongoing purpose' },
]);
export const START_RULES = Object.freeze([
  { id: 'on-activation', label: 'When the Agreement is approved', hint: 'Never before required consent and provider checks' },
  { id: 'scheduled', label: 'On a chosen date', hint: 'Only after approvals are complete' },
]);
export const STOP_RULES = Object.freeze([
  { id: 'target-or-date', label: 'At the target or deadline', hint: 'Whichever comes first' },
  { id: 'date-only', label: 'At the deadline', hint: 'Any excess needs an agreed rule' },
]);
export const SURPLUS_RULES = Object.freeze([
  { id: 'refund', label: 'Return the unused amount', hint: 'To those entitled under the accepted terms' },
  { id: 'new-consent', label: 'Ask contributors first', hint: 'No new use without proper approval' },
]);
export const CHANGE_RULES = Object.freeze([
  { id: 'affected-consent', label: 'Ask affected contributors', hint: 'Fresh acceptance of material changes' },
  { id: 'existing-quorum', label: 'Use our agreed group voting rules', hint: 'Only if the existing mandate allows it' },
]);
export const PAYOUT_RULES = Object.freeze([
  { id: 'verified-beneficiary', label: 'Pay the verified beneficiary', hint: 'Only against the accepted obligation and valid authority' },
  { id: 'two-approvers', label: 'Two authorized people approve', hint: 'Both roles must be verified and independent where required' },
  { id: 'existing-mandate', label: 'Use our existing agreed payout rules', hint: 'A verified group mandate must already exist' },
]);

const FAILURE_OPTIONS = Object.freeze({
  buy: [
    { id: 'return', label: 'Return contributions if the purchase cannot proceed', hint: 'Subject to agreed deductions and provider refund capability' },
    { id: 'extension-consent', label: 'Offer one extension, otherwise return', hint: 'Extension needs valid consent and a still-valid offer' },
    { id: 'decision-return', label: 'Let us decide, then return if no decision', hint: 'A time-limited vote with a definite refund fallback' },
  ],
  paid: [
    { id: 'remain-due', label: 'Keep any unpaid balance due', hint: 'Only if it is genuinely owed under accepted terms' },
    { id: 'agreed-instalments', label: 'Offer an agreed instalment plan', hint: 'Never amend a payer’s obligation silently' },
    { id: 'cancel-under-terms', label: 'Handle cancellation under the Agreement', hint: 'Any refund must follow the accepted terms' },
  ],
  regular: [
    { id: 'remain-due', label: 'Carry the unpaid obligation forward', hint: 'Only for amounts validly due' },
    { id: 'pause-service', label: 'Pause the related service if the terms allow', hint: 'Respect notice periods and service rights' },
    { id: 'review-cycle', label: 'Review this cycle before starting another', hint: 'Do not charge or collect twice' },
  ],
  group: [
    { id: 'hold-review', label: 'Pause payout for group review', hint: 'A finite decision deadline and a lawful fallback are required' },
    { id: 'approved-grace', label: 'Use an agreed grace period', hint: 'Then apply the approved fallback' },
    { id: 'return-if-cancelled', label: 'Return funds if this cycle is cancelled', hint: 'Only to contributors entitled under the group rules' },
  ],
  give: [
    { id: 'close-report', label: 'Close and report what was received', hint: 'Giving is not automatically refundable' },
    { id: 'conditional-return', label: 'Return conditional contributions if the purpose fails', hint: 'Only where refund rights were accepted' },
    { id: 'ask-before-repurpose', label: 'Ask before changing the purpose', hint: 'An alternative use needs appropriate authority' },
  ],
  goal: [
    { id: 'return', label: 'Return the funds if the goal cannot proceed', hint: 'Apply accepted ownership and refund terms' },
    { id: 'renew-consent', label: 'Ask to extend the savings period', hint: 'Fresh approval when the permitted term expires' },
    { id: 'agreed-next-term', label: 'Apply the existing approved next-term rule', hint: 'Only if contributors have already accepted it' },
  ],
});

export function failureOptions(kind) {
  return Object.prototype.hasOwnProperty.call(FAILURE_OPTIONS, kind) ? FAILURE_OPTIONS[kind] : [];
}
export function newGovernanceDraft(kind) {
  if (!COLLECTION_KINDS.includes(kind)) throw new Error('Unknown collection purpose');
  return Object.freeze({
    kind,
    capacity: null,
    contributorScope: null,
    beneficiaryRule: null,
    targetMode: null,
    targetAmountKes: null,
    stopRule: null,
    surplusRule: null,
    startRule: null,
    startDate: null,
    deadline: null,
    failureRule: null,
    changeRule: null,
    payoutRule: null,
  });
}
export function withGovernanceAnswer(draft, key, value) {
  if (!Object.prototype.hasOwnProperty.call(draft, key) || key === 'kind') throw new Error('Invalid governance answer');
  const next = { ...draft, [key]: value };
  if (key === 'targetMode') {
    next.targetAmountKes = null;
    next.stopRule = value === 'open' ? 'date-only' : null;
    next.surplusRule = null;
  }
  if (key === 'stopRule') next.surplusRule = null;
  if (key === 'startRule') next.startDate = null;
  return Object.freeze(next);
}
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const instant = new Date(Date.UTC(year, month - 1, day));
  return instant.getUTCFullYear() === year && instant.getUTCMonth() === month - 1 && instant.getUTCDate() === day;
}
export function assessGovernanceDraft(draft, todayIso) {
  const missing = [];
  if (!draft || !COLLECTION_KINDS.includes(draft.kind)) return Object.freeze({ draftComplete: false, missing: ['Select a valid collection purpose'], activationAllowed: false, authorityVerified: false });
  if (!ACTOR_CAPACITIES.some(x => x.id === draft.capacity)) missing.push('Choose who you are collecting for');
  if (!CONTRIBUTOR_SCOPES.some(x => x.id === draft.contributorScope)) missing.push('Decide who can contribute');
  if (!beneficiaryOptions(draft.kind).some(x => x.id === draft.beneficiaryRule)) missing.push('Choose the rightful payout beneficiary');
  if (!TARGET_MODES.some(x => x.id === draft.targetMode)) missing.push('Decide whether there is a target amount');
  if (draft.kind === 'buy' && draft.targetMode !== 'fixed') missing.push('A specific item purchase requires a fixed target');
  if (draft.targetMode === 'fixed') {
    if (!Number.isSafeInteger(draft.targetAmountKes) || draft.targetAmountKes <= 0) missing.push('Enter a positive whole-KSh target');
    if (!STOP_RULES.some(x => x.id === draft.stopRule)) missing.push('Choose when the collection stops');
    if (draft.stopRule === 'date-only' && !SURPLUS_RULES.some(x => x.id === draft.surplusRule)) missing.push('Agree what happens to any money above the target');
  } else if (draft.targetMode === 'open' && draft.stopRule !== 'date-only') {
    missing.push('An open collection must stop at its stated deadline');
  }
  if (!START_RULES.some(x => x.id === draft.startRule)) missing.push('Choose when contributions may start');
  if (draft.startRule === 'scheduled' && (!isCalendarDate(draft.startDate) || !isCalendarDate(todayIso) || draft.startDate <= todayIso || (isCalendarDate(draft.deadline) && draft.startDate > draft.deadline))) {
    missing.push('Choose a valid start date before or on the closing date');
  }
  if (!isCalendarDate(draft.deadline) || !isCalendarDate(todayIso) || draft.deadline <= todayIso) missing.push('Choose a future closing date');
  if (!failureOptions(draft.kind).some(x => x.id === draft.failureRule)) missing.push('Choose what happens if the collection does not go as planned');
  if (!CHANGE_RULES.some(x => x.id === draft.changeRule)) missing.push('Choose who may approve material changes');
  if (!PAYOUT_RULES.some(x => x.id === draft.payoutRule)) missing.push('Choose how payouts will be authorized');
  if (['buy', 'group'].includes(draft.kind) && draft.payoutRule === 'verified-beneficiary') missing.push('Group payouts need an approved group mandate or independently authorized approvers');
  return Object.freeze({ draftComplete: missing.length === 0, missing: Object.freeze(missing), activationAllowed: false, authorityVerified: false });
}

/**
 * Client questions are not sufficient evidence. These independent gates stay
 * unresolved until backend/provider certification; never convert a complete
 * local draft to a real Agreement, funding permission or Payment Ready.
 */
export const SERVER_GATES = Object.freeze([
  'Verify collector identity, legal capacity and beneficial recipient',
  'Bind exact purpose, source and latest Agreement version',
  'Obtain and record every required participant acceptance or existing valid mandate',
  'Verify lawful provider, custody account, collection window, payout and refund capabilities',
  'Confirm exact closing time and timezone, with no indefinite fund hold',
  'Establish immutable authorization, expiry, reversal and audit instructions',
]);

export function canExecuteCollection() {
  return false;
}
