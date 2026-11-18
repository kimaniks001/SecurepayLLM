import { assessGovernanceDraft } from './governanceDraft.mjs';

/**
 * C2 human-answer translation into an AUTHENTICATED backend draft request.
 * Never makes a network call. The object passed as 'context' is merely a
 * formatting hint; backend controls the actual Agreement version, identity,
 * group target, deadline and Money authorization.
 *
 * The Mini preview does not currently have any real canonical context and
 * MUST NOT call this helper with invented IDs or dates.
 */
const BENEFICIARIES = Object.freeze({
  buy: { merchant: 'MERCHANT' },
  paid: { collector: 'OWN_PAYEE', organization: 'ORGANIZATION' },
  regular: { collector: 'PROVIDER', organization: 'ORGANIZATION' },
  group: { rotation: 'ROTATION_MEMBER', merchant: 'MERCHANT' },
  give: { organization: 'ORGANIZATION', 'named-person': 'NAMED_PERSON' },
  goal: { education: 'SCHOOL', organization: 'DESIGNATED_BENEFICIARY' },
});
const FAILURES = Object.freeze({
  buy: { return: 'RETURN', 'extension-consent': 'EXTEND_WITH_CONSENT', 'decision-return': 'DECIDE_THEN_RETURN' },
  paid: { 'remain-due': 'REMAIN_DUE', 'agreed-instalments': 'INSTALMENTS_WITH_CONSENT', 'cancel-under-terms': 'CANCEL_UNDER_TERMS' },
  regular: { 'remain-due': 'REMAIN_DUE', 'pause-service': 'PAUSE_IF_AUTHORIZED', 'review-cycle': 'REVIEW_CYCLE' },
  group: { 'hold-review': 'PAUSE_WITH_FALLBACK', 'approved-grace': 'GRACE_PERIOD', 'return-if-cancelled': 'RETURN_ON_CANCELLATION' },
  give: { 'close-report': 'CLOSE_AND_REPORT', 'conditional-return': 'CONDITIONAL_RETURN', 'ask-before-repurpose': 'CONSENT_BEFORE_REPURPOSE' },
  goal: { return: 'RETURN', 'renew-consent': 'EXTEND_WITH_CONSENT', 'agreed-next-term': 'APPROVED_NEXT_TERM' },
});
const STOP = Object.freeze({ 'target-or-date': 'TARGET_OR_DATE', 'date-only': 'DATE_ONLY' });
const SURPLUS = Object.freeze({ refund: 'RETURN_SURPLUS', 'new-consent': 'FRESH_CONSENT' });
const CHANGE = Object.freeze({ 'affected-consent': 'AFFECTED_CONSENT', 'existing-quorum': 'EXISTING_QUORUM' });
const PAYOUT = Object.freeze({ 'verified-beneficiary': 'VERIFIED_BENEFICIARY', 'two-approvers': 'TWO_APPROVERS', 'existing-mandate': 'EXISTING_MANDATE' });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isInstant = x => typeof x === 'string' && !Number.isNaN(Date.parse(x)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(x);
function requiredValue(table, key, what) {
  if (key == null || !Object.prototype.hasOwnProperty.call(table, key)) throw new Error('Invalid ' + what);
  return table[key];
}
function requiredDay(day, what) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Missing ' + what);
  return day;
}

export function prepareCollectionGovernanceSubmission(draft, context, idempotencyKey) {
  if (!draft || !context || typeof context !== 'object') throw new Error('Canonical collection context required');
  if (!UUID.test(context.agreementId || '') || !UUID.test(context.groupSecureLinkId || '')) throw new Error('Canonical identifiers required');
  if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.length > 128) throw new Error('Stable request key required');
  if (!context.timeZone || typeof context.timeZone !== 'string') throw new Error('Collection time zone required');
  if (!isInstant(context.contributionDeadline)) throw new Error('Absolute contribution deadline required');
  if (requiredDay(context.closingLocalDate, 'local closing date') !== draft.deadline) throw new Error('Closing date mismatch');
  const assessed = assessGovernanceDraft(draft, requiredDay(context.todayIso, 'current local date'));
  if (!assessed.draftComplete) throw new Error('Unanswered collection rules: ' + assessed.missing.join('; '));

  const targetType = draft.targetMode === 'fixed' ? 'FIXED_AMOUNT' : 'OPEN_ENDED';
  if (context.targetType !== targetType) throw new Error('Group target type mismatch');
  let targetAmountMinor = null;
  if (draft.targetMode === 'fixed') {
    targetAmountMinor = draft.targetAmountKes * 100;
    if (!Number.isSafeInteger(targetAmountMinor) || targetAmountMinor <= 0 || targetAmountMinor !== context.targetAmountMinor) {
      throw new Error('Target amount does not match canonical group');
    }
  } else if (context.targetAmountMinor != null) throw new Error('Open target unexpectedly has an amount');

  let scheduledStartAt = null;
  if (draft.startRule === 'scheduled') {
    if (!isInstant(context.scheduledStartAt) || context.startLocalDate !== draft.startDate) throw new Error('Scheduled start mismatch');
    scheduledStartAt = context.scheduledStartAt;
  } else if (context.scheduledStartAt != null) {
    throw new Error('Unscheduled collection cannot claim a start timestamp');
  }

  const beneficiaryRule = requiredValue(requiredValue(BENEFICIARIES, draft.kind, 'purpose'), draft.beneficiaryRule, 'beneficiary');
  const failureRule = requiredValue(requiredValue(FAILURES, draft.kind, 'purpose'), draft.failureRule, 'failure policy');
  const terms = Object.freeze({
    purposeKind: draft.kind,
    collectorCapacity: draft.capacity,
    contributorScope: draft.contributorScope,
    beneficiaryRule,
    sourceReference: context.sourceReference || null,
    sourceVersion: context.sourceVersion || null,
    targetType,
    targetAmountMinor,
    startRule: draft.startRule === 'scheduled' ? 'SCHEDULED' : 'AFTER_APPROVAL',
    scheduledStartAt,
    endAt: context.contributionDeadline,
    stopRule: requiredValue(STOP, draft.stopRule, 'stop rule'),
    surplusRule: draft.surplusRule == null ? null : requiredValue(SURPLUS, draft.surplusRule, 'surplus rule'),
    failureRule,
    changeRule: requiredValue(CHANGE, draft.changeRule, 'change authority'),
    payoutRule: requiredValue(PAYOUT, draft.payoutRule, 'payout authority'),
  });
  return Object.freeze({
    agreementId: context.agreementId,
    body: Object.freeze({ idempotencyKey, terms }),
  });
}
