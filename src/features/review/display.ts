import type { ReviewCaseDetailResponse, ReviewCaseSummaryResponse, ReviewEvidenceType } from '../../api/securepay/agreement-review/dto';

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

// ------------------------------------------------------------------------------------------------ Phase 7 Slice 6

/** Evidence types a participant may choose when adding evidence (identity/location confirmations are not participant uploads). */
export const PARTICIPANT_EVIDENCE_TYPES: readonly ReviewEvidenceType[] = ['DOCUMENT', 'IMAGE', 'RECEIPT', 'DELIVERY_RECORD', 'AGREEMENT_RECORD', 'COMMUNICATION', 'OTHER'];
const EVIDENCE_CAPABLE_ROLES = new Set(['OPENER', 'RESPONDENT', 'AFFECTED_BENEFICIARY', 'AFFECTED_FUNDER']);
const EVIDENCE_OPEN_STATES = new Set(['AWAITING_RESPONSE', 'EVIDENCE_COLLECTION']);

/**
 * Whether to OFFER "Add evidence" -- mirrors SecurePay's own policy (AgreementReviewEvidenceSubmissionPolicy + the participant access policy) from the
 * FRESH case read: an evidence-capable role, a state that accepts participant evidence, and an evidence deadline not yet passed. SecurePay re-checks
 * everything and stays authoritative; this only decides whether the control is shown.
 */
export function canAddEvidence(d: Pick<ReviewCaseDetailResponse, 'state' | 'callerRole' | 'evidenceDeadlineAt'> | null, now: Date = new Date()): boolean {
  if (!d || !EVIDENCE_OPEN_STATES.has(d.state) || !EVIDENCE_CAPABLE_ROLES.has(d.callerRole)) return false;
  if (d.evidenceDeadlineAt && new Date(d.evidenceDeadlineAt).getTime() < now.getTime()) return false;
  return true;
}

export const EVIDENCE_NOT_OPEN = 'Adding evidence isn’t open at this stage of the review.';

// ------------------------------------------------------------------------------------------------ Phase 7 Slice 6B (v2 opening)
/** Why nothing can be opened on this Agreement right now -- SecurePay's own reason, in words. Unknown -> fail closed. */
const OPENING_UNAVAILABLE: Readonly<Record<string, string>> = {
  AGREEMENT_CLOSED: 'This Agreement has ended, so a formal review can’t be started on it.',
  CURRENCY_NOT_SUPPORTED: 'Formal reviews aren’t available for this Agreement’s currency yet.',
  CONFIRM_THE_AGREEMENT_FIRST: 'Confirm the Agreement first. Only participants who have confirmed it can start a formal review.',
  NO_SUBJECT_AVAILABLE: 'Nothing on this Agreement can be placed under a formal review right now. Each option below says why.',
};
export const openingUnavailableWords = (code: string | null) => (code && OPENING_UNAVAILABLE[code]) || 'SecurePay says a formal review can’t be started here right now.';

const SUBJECT_UNAVAILABLE: Readonly<Record<string, string>> = {
  NO_AMOUNT_UNDER_REVIEW: 'This Agreement has no amount that could be placed under review.',
  NO_OTHER_PARTY: 'Nobody else is part of this, so there is no one to review it with.',
  OTHER_PARTY_HAS_NOT_CONFIRMED: 'Someone whose position this affects hasn’t confirmed the Agreement yet, and nobody affected may be left out.',
  REVIEW_ALREADY_OPEN: 'A formal review already covers this.',
  REVIEW_RESERVE_NOT_READY: 'One or more of the people involved don’t have the Review Reserve this needs yet.',
};
export const subjectUnavailableWords = (code: string | null) => (code && SUBJECT_UNAVAILABLE[code]) || 'SecurePay says this can’t be placed under review right now.';

/** The bounded reason categories (v2 open reason codes) in words. Only codes SecurePay offers are shown; unknown codes are not offered. */
export const REVIEW_REASON_WORDS: Readonly<Record<string, string>> = {
  PARTICIPANT_DISPUTE_OBLIGATION: 'The work or payment wasn’t done as agreed',
  PARTICIPANT_DISPUTE_EVIDENCE: 'The evidence given isn’t right',
  PARTICIPANT_DISPUTE_RELEASE_REQUIREMENT: 'A condition for releasing money isn’t met',
  PARTICIPANT_DISPUTE_CONDITION: 'Another agreed condition isn’t met',
};

const V2_STATE: Readonly<Record<string, string>> = {
  OPENED: 'Opened — waiting for the participants',
  ACTIVE_NEGOTIATION: 'Participants are proposing how to settle it',
  MAIN_ALLOCATION_MATCHED: 'The main settlement proposals match',
  COMPLETE_SETTLEMENT_MATCHED: 'The full settlement matches',
  CONFIRMATION_PENDING: 'Waiting for everyone to confirm the settlement',
  RESOLVED_BY_MATCHING: 'Resolved — everyone confirmed the same settlement',
  WITHDRAWN_BEFORE_RESPONSE: 'Withdrawn before anyone responded',
  UNRESOLVED_INACTIVE: 'Unresolved — no recent activity',
  LEGALLY_RESOLVED: 'Resolved by a verified legal direction',
  SUPERSEDED: 'Replaced by another review of the same issue',
};
export const v2StateWords = (state: string) => V2_STATE[state] ?? UNKNOWN_STATE;

const V2_ROLE: Readonly<Record<string, string>> = {
  OPENER: 'Opened it', RESPONDENT: 'Asked to respond', AFFECTED_BENEFICIARY: 'Affected (receives under it)', AFFECTED_FUNDER: 'Affected (pays under it)',
};
export const v2RoleWords = (role: string | null) => (role && V2_ROLE[role]) || 'Taking part';

/** What a subject option is, in words -- never an id. */
export const v2SubjectWords = (s: { subjectType: string; workTitle: string | null }) =>
  s.subjectType === 'AGREEMENT' ? 'The whole Agreement' : s.workTitle ? `Work: ${s.workTitle}` : 'A piece of work';

/** What becomes restricted from release if this is opened (SecurePay's own isolation, never decided here). */
export const v2RestrictedWords = (s: { wholeAgreementRestricted: boolean; subjectType: string; workTitle: string | null }) =>
  s.wholeAgreementRestricted
    ? (s.subjectType === 'AGREEMENT' ? 'The whole Agreement' : `The whole Agreement — “${s.workTitle ?? 'this work'}” has no separate amount, so it can’t be reviewed on its own`)
    : `Only this work: “${s.workTitle ?? 'this work'}”`;

export const V2_BOUNDARY = 'SecurePay records the review and restricts release of what it covers. SecurePay does not decide who is right, and opening a review does not move any money. It ends when everyone involved confirms the same settlement, or by a verified legal direction.';
