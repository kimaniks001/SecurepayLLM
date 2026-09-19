import type { CanonicalAgreementResponse, ErrorStateResponse, NoticeResponse } from '../../types';
import type { ReviewedSourceDto } from '../../api/securepay/agent/dto';
import type { HandoffReviewView, HandoffView } from './controller';

function formatMoney(currency: string | null, amountMinor: number | null): string {
  if (amountMinor == null) return 'Not yet specified';
  const major = (amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${major}` : major;
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
    title: reviewedSource.sourceTitle ?? 'Store offer',
    ownerKsNumber: reviewedSource.sourceOwnerKsNumber,
    priceLine: formatMoney(reviewedSource.capturedCurrency, reviewedSource.capturedPriceMinor),
    status: reviewedSource.sourceStatus === 'CHANGED' || reviewedSource.sourceStatus === 'UNAVAILABLE' ? reviewedSource.sourceStatus : 'CURRENT',
    statusLabel,
  };
}

/**
 * Composes the locked canonical Agreement review card from the authoritative /review candidate —
 * never the Agent preview. The card's own `mustSettle` gate (not an ignored disabled flag) is what
 * actually blocks its primary button, so a status short of READY_TO_PROGRESS is surfaced as a
 * must-settle item rather than a cosmetic-only flag the component does not read.
 */
export function canonicalAgreementView(review: HandoffReviewView, handoff: HandoffView): CanonicalAgreementResponse {
  const candidate = review.candidate;
  const readyToProgress = handoff.status === 'READY_TO_PROGRESS';
  const mustSettle = handoff.unresolvedMatters.map(matter => ({ label: 'Unresolved', detail: matter }));
  if (!readyToProgress) {
    mustSettle.push({ label: 'Not yet ready', detail: 'SecurePay has not confirmed this is ready to set. Refresh to check again.' });
  }
  return {
    type: 'CANONICAL_AGREEMENT',
    title: candidate.title ?? candidate.purpose ?? 'Agreement under review',
    version: String(handoff.reviewSnapshot.expectedTradeContextVersion),
    status: handoff.status,
    parties: candidate.who.map(name => ({ name, role: '' })),
    work: candidate.what.length ? candidate.what : ['Not yet specified'],
    price: formatMoney(candidate.currency, candidate.amountMinor),
    source: sourceView(review.reviewedSource),
    completion: candidate.when.length ? candidate.when.join(', ') : 'Not yet specified',
    worthSettling: handoff.guidanceNotes.map(note => ({ label: 'Guidance', detail: note })),
    mustSettle,
    primaryLabel: 'Set securely',
    primaryValue: 'set_securely',
    secondaryLabel: readyToProgress ? 'Back to conversation' : 'Refresh',
    secondaryValue: readyToProgress ? 'back_to_conversation' : 'refresh_review',
  };
}

export function handoffNoticeView(handoff: HandoffView): NoticeResponse {
  if (handoff.status === 'NEEDS_RESOLUTION') {
    return { type: 'NOTICE', label: 'Still needs your input', text: handoff.guidanceNotes[0] ?? 'SecurePay needs more from the conversation before this can continue.', tone: 'worth_checking' };
  }
  if (handoff.status === 'REVIEW_STALE') {
    // Final Phase 4 Economy Turn 3 (Section 7) -- when the staleness traces to the bound
    // commercial source specifically, say exactly what changed rather than a generic notice.
    const source = handoff.reviewedSource;
    if (source && source.sourceStatus === 'UNAVAILABLE') {
      return { type: 'NOTICE', label: 'This source is no longer available', text: `${source.sourceTitle ?? 'This offer'} is no longer available. Go back and choose a different source, or continue this conversation directly.`, tone: 'worth_checking' };
    }
    if (source && source.sourceStatus === 'CHANGED' && source.current) {
      const reviewedPrice = formatMoney(source.capturedCurrency, source.capturedPriceMinor);
      const currentPrice = formatMoney(source.current.capturedCurrency, source.current.capturedPriceMinor);
      const detail = source.current.capturedAvailabilityState !== source.capturedAvailabilityState
        ? `Reviewed: ${source.capturedAvailabilityState ?? 'unknown'} / Current: ${source.current.capturedAvailabilityState ?? 'unknown'}`
        : `Reviewed: ${reviewedPrice} / Current: ${currentPrice}`;
      return { type: 'NOTICE', label: 'The source changed', text: `${source.sourceTitle ?? 'This offer'} changed since you reviewed it. ${detail}. Review the current source, or go back.`, tone: 'worth_checking' };
    }
    return { type: 'NOTICE', label: 'This changed', text: 'What SecurePay understands has changed since this was last reviewed. Nothing has been set from the stale view.', tone: 'worth_checking' };
  }
  return {
    type: 'NOTICE',
    label: 'Draft Agreement created',
    text: `A real draft Agreement (${handoff.progressedAgreementId ?? 'unknown'}) now exists from this handoff. It still needs the next Agreement steps — it is not accepted, funded, or paid.`,
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
