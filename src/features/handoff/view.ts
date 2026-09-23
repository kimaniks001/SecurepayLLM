import type { CanonicalAgreementResponse, ErrorStateResponse, NoticeResponse } from '../../types';
import type { ReviewedSourceDto } from '../../api/securepay/agent/dto';
import { formatMinor } from '../discovery/money';
import type { SourceView } from '../discovery/ui/SourceReference';
import type { HandoffReviewView, HandoffView } from './controller';

// Integer-safe: amounts are minor units and are never divided as floats.
export function formatHandoffMoney(currency: string | null, amountMinor: number | null): string {
  if (amountMinor == null) return 'Not yet specified';
  return formatMinor(amountMinor, currency ?? '') ?? 'Not yet specified';
}

/** The one place a handoff's reviewed source becomes a SourceReference: type passed through as given, status only ever the backend's. */
export function sourceReferenceView(source: ReviewedSourceDto): SourceView {
  return {
    sourceType: source.sourceType, title: source.sourceTitle ?? 'Selected listing', ownerKs: source.sourceOwnerKsNumber,
    capturedPriceMinor: source.capturedPriceMinor, capturedCurrency: source.capturedCurrency, capturedAvailability: source.capturedAvailabilityState,
    status: source.sourceStatus === 'CHANGED' || source.sourceStatus === 'UNAVAILABLE' ? source.sourceStatus : 'CURRENT',
    current: source.current ? { priceMinor: source.current.capturedPriceMinor, currency: source.current.capturedCurrency, availability: source.current.capturedAvailabilityState } : null,
  };
}

/**
 * Final Phase 4 Economy Turn 3 (Section 6) -- the reviewed commercial source, rendered as
 * provenance/commercial context only. This is explicitly NOT: an accepted offer, Agreement
 * authority, participant authority, or payment authority -- see the canonical review card itself.
 */
function sourceView(reviewedSource: ReviewedSourceDto | null): CanonicalAgreementResponse['source'] {
  if (!reviewedSource) return undefined;
  const statusLabel = reviewedSource.sourceStatus === 'CHANGED' ? 'Changed'
    : reviewedSource.sourceStatus === 'UNAVAILABLE' ? 'Unavailable' : 'Current';
  return {
    sourceType: reviewedSource.sourceType,
    title: reviewedSource.sourceTitle ?? 'Store offer',
    ownerKsNumber: reviewedSource.sourceOwnerKsNumber,
    priceLine: formatHandoffMoney(reviewedSource.capturedCurrency, reviewedSource.capturedPriceMinor),
    status: reviewedSource.sourceStatus === 'CHANGED' || reviewedSource.sourceStatus === 'UNAVAILABLE' ? reviewedSource.sourceStatus : 'CURRENT',
    statusLabel,
    capturedPriceMinor: reviewedSource.capturedPriceMinor, capturedCurrency: reviewedSource.capturedCurrency, capturedAvailability: reviewedSource.capturedAvailabilityState,
    current: reviewedSource.current ? { priceMinor: reviewedSource.current.capturedPriceMinor, currency: reviewedSource.current.capturedCurrency, availability: reviewedSource.current.capturedAvailabilityState } : null,
  };
}

/**
 * Composes the locked canonical Agreement review card from the authoritative /review candidate —
 * never the Agent preview. The card's own `mustSettle` gate (not an ignored disabled flag) is what
 * actually blocks its primary button, so a status short of READY_TO_PROGRESS is surfaced as a
 * must-settle item rather than a cosmetic-only flag the component does not read.
 *
 * KS001 Upgrade Phase 2 final convergence correction (items 2/5) -- `mustSettle` is built ONLY from
 * `handoff.mustResolve` (a genuine BLOCKS_SET matter); `stillToDecide` (a decide-later matter, e.g. no
 * provider chosen yet) is folded into the non-blocking `worthSettling` list instead, alongside ordinary
 * guidance notes, each under its own distinguishing label. `parties`/`completion` now render the
 * STATE-AWARE review facts (`review.who`/`review.when`) rather than the flattened, state-agnostic
 * `candidate.who`/`candidate.when` -- a suggested person/date is visibly "suggested," never shown as if
 * already agreed (Section 9/22).
 *
 * KS001 Upgrade Phase 2 final acceptance correction (item 3) -- ALSO renders `review.responsibilities`/
 * `review.money`/`review.conditions`/`review.authority` (previously parsed but silently ignored here), so
 * the broadened backend review truth actually reaches the person. These are presentation-only,
 * OMITTED (undefined, not an empty array) when the review carried no such facts -- see
 * `CanonicalAgreementResponse`'s own doctrine for why they stay structurally separate from the
 * authoritative `price`/`completion` fields Set Up Agreement actually reads.
 */
function reviewSection(facts: HandoffReviewView['responsibilities']): { description: string; confirmed: boolean }[] | undefined {
  return facts.length > 0 ? facts : undefined;
}
export function canonicalAgreementView(review: HandoffReviewView, handoff: HandoffView): CanonicalAgreementResponse {
  const candidate = review.candidate;
  const readyToProgress = handoff.status === 'READY_TO_PROGRESS';
  const backToConversation = readyToProgress || handoff.mustResolve.length > 0;
  const mustSettle = handoff.mustResolve.map(matter => ({ label: 'Needs your decision', detail: matter }));
  if (!readyToProgress && mustSettle.length === 0) {
    mustSettle.push({ label: 'Not yet ready', detail: 'SecurePay has not confirmed this is ready to set. Refresh to check again.' });
  }
  const worthSettling = [
    ...handoff.stillToDecide.map(matter => ({ label: 'Still to decide', detail: matter })),
    ...handoff.guidanceNotes.map(note => ({ label: 'Guidance', detail: note })),
  ];
  const parties = review.who.length > 0
    ? review.who.map(fact => ({ name: fact.description, role: fact.confirmed ? 'confirmed' : 'suggested' }))
    : candidate.who.map(name => ({ name, role: '' }));
  const completion = review.when.length > 0
    ? review.when.map(fact => `${fact.description} (${fact.confirmed ? 'confirmed' : 'suggested'})`).join(', ')
    : candidate.when.length ? candidate.when.join(', ') : 'Not yet specified';
  return {
    type: 'CANONICAL_AGREEMENT',
    title: candidate.title ?? candidate.purpose ?? 'Agreement under review',
    version: String(handoff.reviewSnapshot.expectedTradeContextVersion),
    status: handoff.status,
    parties,
    work: candidate.what.length ? candidate.what : ['Not yet specified'],
    price: formatHandoffMoney(candidate.currency, candidate.amountMinor),
    source: sourceView(review.reviewedSource),
    completion,
    responsibilities: reviewSection(review.responsibilities),
    money: reviewSection(review.money),
    conditions: reviewSection(review.conditions),
    authority: reviewSection(review.authority),
    worthSettling,
    mustSettle,
    // Truthful: the backend creates a DRAFT Agreement here -- not a proposal, acceptance or payment.
    primaryLabel: 'Create the draft Agreement',
    primaryValue: 'create_draft',
    secondaryLabel: backToConversation ? (readyToProgress ? 'Change something' : 'Back to the conversation') : 'Refresh',
    secondaryValue: backToConversation ? 'back_to_conversation' : 'refresh_review',
    consequence: 'This creates a draft Agreement. It is not sent, accepted, funded or paid, and nothing is created until you choose.',
  };
}

export function handoffNoticeView(handoff: HandoffView): NoticeResponse {
  if (handoff.status === 'NEEDS_RESOLUTION') {
    // KS001 Upgrade Phase 2 final convergence correction (item 1) -- NEEDS_RESOLUTION now only ever
    // reflects a genuine BLOCKS_SET matter, so its own description is the most direct, truthful text.
    return { type: 'NOTICE', label: 'Still needs your input', text: handoff.mustResolve[0] ?? handoff.guidanceNotes[0] ?? 'SecurePay needs more from the conversation before this can continue.', tone: 'worth_checking' };
  }
  if (handoff.status === 'REVIEW_STALE') {
    // Final Phase 4 Economy Turn 3 (Section 7) -- when the staleness traces to the bound
    // commercial source specifically, say exactly what changed rather than a generic notice.
    const source = handoff.reviewedSource;
    if (source && source.sourceStatus === 'UNAVAILABLE') {
      return { type: 'NOTICE', label: 'This source is no longer available', text: `${source.sourceTitle ?? 'This listing'} is no longer available. Your earlier choice is kept below for reference. Go back to the conversation to choose another listing.`, tone: 'worth_checking' };
    }
    if (source && source.sourceStatus === 'CHANGED' && source.current) {
      // What changed is laid out beside it (Selected earlier / Current listing) -- the browser never reconciles the two.
      return { type: 'NOTICE', label: 'The listing changed', text: `${source.sourceTitle ?? 'This listing'} is different now from when you chose it. You can review again with the current listing, or go back to the conversation. Nothing has been changed.`, tone: 'worth_checking' };
    }
    return { type: 'NOTICE', label: 'This changed', text: 'What SecurePay understands has changed since this was last reviewed. Nothing has been set from the stale view.', tone: 'worth_checking' };
  }
  return {
    type: 'NOTICE',
    label: 'Draft Agreement created',
    text: 'A draft Agreement now exists from this review. Nobody has been invited, and it is not sent, accepted, funded or paid. You can open it to invite someone.',
    tone: 'important',
  };
}

export function handoffErrorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'This could not continue', text: message, primaryLabel: 'Return to conversation', primaryValue: 'back_to_conversation' };
}

export function expiredHandoffView(): ErrorStateResponse {
  return {
    type: 'ERROR_STATE',
    title: 'This continuation expired',
    text: 'This handoff is no longer valid. Return to the conversation and start a fresh continuation when you are ready.',
    primaryLabel: 'Return to conversation',
    primaryValue: 'back_to_conversation',
  };
}
