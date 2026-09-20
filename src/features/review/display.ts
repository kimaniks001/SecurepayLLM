import type { ReviewCaseDetailResponse, ReviewCaseSummaryResponse } from '../../api/securepay/agreement-review/dto';

/**
 * Bounded customer language for SecurePay's closed Agreement Review vocabularies. An unknown value is never echoed as the message and never guessed.
 * Review outcomes are FINANCIALLY NON-EXECUTING: no wording here says money moved, was released, was frozen or was settled.
 */

const STATE: Readonly<Record<string, string>> = {
  OPENED: 'Formal review opened',
  AWAITING_RESPONSE: 'Waiting for response',
  EVIDENCE_COLLECTION: 'Evidence being gathered',
  UNDER_REVIEW: 'Under review',
  DECISION_PENDING: 'Decision pending',
  DECIDED: 'Review decided',
  CANCELLED: 'Review cancelled',
  EXPIRED: 'Review expired',
  SUPERSEDED: 'Replaced by a later review',
};
export const UNKNOWN_STATE = 'SecurePay has a review state this screen cannot describe yet.';
export const stateWords = (state: string) => STATE[state] ?? UNKNOWN_STATE;

const TERMINAL = new Set(['DECIDED', 'CANCELLED', 'EXPIRED', 'SUPERSEDED']);
const ACTIVE = new Set(['OPENED', 'AWAITING_RESPONSE', 'EVIDENCE_COLLECTION', 'UNDER_REVIEW', 'DECISION_PENDING']);
/** Active vs history is decided by the backend STATE only. An unknown state is neither: it is listed separately, never assumed active or closed. */
export const stateGroup = (state: string): 'active' | 'history' | 'unknown' => ACTIVE.has(state) ? 'active' : TERMINAL.has(state) ? 'history' : 'unknown';

const OUTCOME: Readonly<Record<string, string>> = {
  RELEASE_ALLOWED: 'The Review allows downstream release qualification.',
  RELEASE_BLOCKED: 'The Review blocks downstream release qualification.',
  OBLIGATION_SATISFIED: 'The Review found the reviewed obligation satisfied.',
  OBLIGATION_NOT_SATISFIED: 'The Review found the reviewed obligation not satisfied.',
  CASE_DISMISSED: 'The Review was dismissed.',
  NO_DECISION: 'The Review closed without a substantive decision.',
  MORE_EVIDENCE_REQUIRED: 'The Review asked for more evidence.',
  ESCALATED: 'The Review was escalated.',
};
export const UNKNOWN_OUTCOME = 'SecurePay has a review outcome this screen cannot describe yet.';
export const outcomeWords = (outcome: string) => OUTCOME[outcome] ?? UNKNOWN_OUTCOME;
/** Said under every decided outcome. A Review outcome never posts ledger entries, executes a release or settles a payment. */
export const OUTCOME_NOT_MONEY = 'A Review decision does not move money by itself. Open Money for the current financial state.';
export const MONEY_MAY_BE_AFFECTED = 'This review may affect whether related money can progress. Open Money for the current financial state.';

const REASON: Readonly<Record<string, string>> = {
  EVIDENCE_SUPPORTS_RELEASE: 'The evidence recorded on the review supports the requirement being met.',
  EVIDENCE_BLOCKS_RELEASE: 'The evidence recorded on the review does not support the requirement being met.',
  OBLIGATION_MET: 'The reviewed obligation was found met.',
  OBLIGATION_NOT_MET: 'The reviewed obligation was found not met.',
  INSUFFICIENT_EVIDENCE: 'There was not enough evidence to decide.',
  PROCEDURAL_DISMISSAL: 'The review was dismissed on procedural grounds.',
  INCONCLUSIVE_RECORD: 'The record was inconclusive.',
};
export const reasonWords = (code: string) => REASON[code] ?? 'SecurePay recorded a decision reason this screen cannot describe yet.';

/** Participant-safe roles only. Reviewer / system / operations roles are never turned into customer language or controls. */
const ROLE: Readonly<Record<string, string>> = {
  OPENER: 'You opened this review',
  RESPONDENT: 'You are asked to respond',
  AFFECTED_BENEFICIARY: 'You are an affected party (beneficiary)',
  AFFECTED_FUNDER: 'You are an affected party (funder)',
};
export const roleWords = (role: string): string | null => ROLE[role] ?? null;

const EVIDENCE_TYPE: Readonly<Record<string, string>> = {
  DOCUMENT: 'Document', IMAGE: 'Image', RECEIPT: 'Receipt', DELIVERY_RECORD: 'Delivery record', AGREEMENT_RECORD: 'Agreement record',
  COMMUNICATION: 'Communication', IDENTITY_CONFIRMATION: 'Identity confirmation', LOCATION_CONFIRMATION: 'Location confirmation', OTHER: 'Other evidence',
};
/** Unknown -> "Evidence". The contents are never inferred from the MIME type or filename. */
export const evidenceTypeWords = (type: string) => EVIDENCE_TYPE[type] ?? 'Evidence';

/** Decimal-free human size for a byte count; a non-safe value is not guessed. */
export function evidenceSize(bytes: number): string {
  if (!Number.isSafeInteger(bytes) || bytes < 0) return 'Size not shown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 104857.6) / 10} MB`;
}

// ---- Which Agreement version the case concerns (exact ids only; never displayed)
export type VersionScope = 'current' | 'earlier' | 'unknown';
export function versionScope(caseVersionId: string | null | undefined, currentVersionId: string | null | undefined): VersionScope {
  if (!caseVersionId || !currentVersionId) return 'unknown';
  return caseVersionId === currentVersionId ? 'current' : 'earlier';
}
export const VERSION_SCOPE_WORDS: Readonly<Record<VersionScope, string>> = {
  current: 'Current Agreement version',
  earlier: 'Earlier Agreement version',
  unknown: 'Agreement version context unavailable',
};

// ---- What is under review. Labels come only from ids already resolved by authoritative reads; otherwise neutral wording.
export interface SubjectLookup {
  versions: ReadonlyMap<string, number> | null;       // versionId -> versionNumber (exact `versions` read), or null when unavailable
  obligations: ReadonlyMap<string, string> | null;    // obligationId -> title (exact `obligations` read), or null when unavailable
}
export const NEUTRAL_SUBJECT = 'A part of this Agreement';
export function subjectLabel(subjectType: string, subjectId: string, lookup: SubjectLookup): string {
  switch (subjectType) {
    case 'AGREEMENT': return 'The Agreement';
    case 'AGREEMENT_VERSION': { const n = lookup.versions?.get(subjectId); return n === undefined ? NEUTRAL_SUBJECT : `Agreement version ${n}`; }
    case 'OBLIGATION': return lookup.obligations?.get(subjectId) ?? NEUTRAL_SUBJECT;
    case 'RELEASE_INSTRUCTION': return 'A payment release instruction';
    default: return NEUTRAL_SUBJECT;
  }
}
export function versionNumberWords(versionId: string, lookup: SubjectLookup): string | null {
  const n = lookup.versions?.get(versionId); return n === undefined ? null : `Agreement version ${n}`;
}

// ---- Deadlines: backend timestamps are shown as facts; the browser clock never changes the case state.
export function deadlineLine(label: string, iso: string | null, state: string, now: Date): { text: string; passedNote: string | null } | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const text = `${label}: ${at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const passed = at.getTime() < now.getTime() && ACTIVE.has(state);
  return { text, passedNote: passed ? `The listed ${label.toLowerCase()} has passed. SecurePay still shows this review as ${stateWords(state)}.` : null };
}

// ---- Participant actions: derived ONLY from the fresh case detail, mirroring the backend's own role/state rules.
export interface ParticipantActions {
  /** RESPONDENT only, state OPENED/AWAITING_RESPONSE, not yet acknowledged. "When I press this SecurePay will record that I have seen this Review." */
  canAcknowledge: boolean;
  /** RESPONDENT/AFFECTED_BENEFICIARY/AFFECTED_FUNDER, state AWAITING_RESPONSE/EVIDENCE_COLLECTION, no response yet (a second response could not supersede after a refresh). */
  canRespond: boolean;
}
const RESPOND_ROLES = new Set(['RESPONDENT', 'AFFECTED_BENEFICIARY', 'AFFECTED_FUNDER']);
export function participantActions(d: Pick<ReviewCaseDetailResponse, 'callerRole' | 'state' | 'callerAcknowledged' | 'callerResponded'>): ParticipantActions {
  return {
    canAcknowledge: d.callerRole === 'RESPONDENT' && (d.state === 'OPENED' || d.state === 'AWAITING_RESPONSE') && !d.callerAcknowledged,
    canRespond: RESPOND_ROLES.has(d.callerRole) && (d.state === 'AWAITING_RESPONSE' || d.state === 'EVIDENCE_COLLECTION') && !d.callerResponded,
  };
}

export const RESPONSE_TYPE_WORDS: ReadonlyArray<{ value: 'DISPUTE_POSITION' | 'CLARIFICATION' | 'PARTIAL_ADMISSION' | 'ACKNOWLEDGEMENT'; label: string; hint: string }> = [
  { value: 'DISPUTE_POSITION', label: 'My position', hint: 'What I say about the issue.' },
  { value: 'CLARIFICATION', label: 'A clarification', hint: 'Something I want to make clear.' },
  { value: 'PARTIAL_ADMISSION', label: 'A partial admission', hint: 'A part of the issue that I accept.' },
  { value: 'ACKNOWLEDGEMENT', label: 'An acknowledgement in words', hint: 'That I have seen the review, in my own words.' },
];

export type CaseRow = Pick<ReviewCaseSummaryResponse, 'state' | 'openedAt'>;
