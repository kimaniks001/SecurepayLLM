import type { AgreementGateway, AgreementInvitationDto } from '../../api/securepay/agreements';
import type { InvitationTargetResponse } from '../../api/securepay/agreements/dto';
import { ApiError } from '../../api/securepay/http';
import { ROLE_CANONICAL } from '../../api/securepay/agent/roles';

/**
 * The roles the creator may offer, each with the canonical code SecurePay's own role vocabulary (the Agent's
 * `RoleVocabulary`) produces. NOTE: the Agreement invitation endpoint itself accepts ANY non-blank `roleCode` string
 * (no server-side enumeration), so this closed list is a UI choice grounded in that vocabulary, not a server rule.
 */
export const INVITE_ROLES: readonly { label: string; code: string }[] = [
  { label: 'Seller', code: ROLE_CANONICAL.seller }, { label: 'Buyer', code: ROLE_CANONICAL.buyer },
  { label: 'Client', code: ROLE_CANONICAL.client }, { label: 'Service provider', code: ROLE_CANONICAL.contractor },
  { label: 'Landlord', code: ROLE_CANONICAL.landlord }, { label: 'Tenant', code: ROLE_CANONICAL.tenant },
  { label: 'Lender', code: ROLE_CANONICAL.lender }, { label: 'Borrower', code: ROLE_CANONICAL.borrower },
  { label: 'Organizer', code: ROLE_CANONICAL.organizer }, { label: 'Recipient', code: ROLE_CANONICAL.recipient },
  { label: 'Counterparty', code: ROLE_CANONICAL.counterparty },
];

/** Agreement statuses in which SecurePay accepts invitations (`AgreementStatus.canIssueInvitations`); the server still decides. */
export const INVITABLE_STATUSES = ['PROPOSED', 'INVITATION_PENDING', 'PARTICIPANTS_JOINING'] as const;

export type InvitePhase = 'closed' | 'form' | 'issuing' | 'uncertain' | 'issued' | 'issued-earlier' | 'error';
export type ListState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; items: AgreementInvitationDto[] } | { status: 'error' };
/**
 * KS001 Upgrade Phase 4 (Section 10) -- the bounded preview shown before issuance. `checked` is the
 * EXACT (normalized) KS Number this preview result answers for, so a stale preview from a since-edited
 * field is never mistaken for confirmation of the current one.
 */
export type KsPreviewState =
  | { status: 'idle' }
  | { status: 'checking'; checked: string }
  | { status: 'found'; checked: string; target: InvitationTargetResponse }
  | { status: 'not-found'; checked: string }
  | { status: 'error'; checked: string };

export interface InviteState {
  phase: InvitePhase;
  roleCode: string | null;
  ksNumber: string;
  ksPreview: KsPreviewState;
  /** The exact request being (re)tried. Held from the first attempt until success or a definite rejection or reset. */
  request: { key: string; roleCode: string; ksNumber: string } | null;
  /** In memory ONLY: a bearer doorway, never persisted or logged. Cleared on reset/leave. */
  /** `link` is null when SecurePay replayed an existing invitation without a token: the exact `invitationId` is kept so it can be revoked precisely. */
  issued: { invitationId: string; link: string | null } | null;
  error: string | null;
  list: ListState;
  proposing: boolean;
  proposeError: string | null;
  revokingId: string | null;
  revokeError: string | null;
}
const initial: InviteState = { phase: 'closed', roleCode: null, ksNumber: '', ksPreview: { status: 'idle' }, request: null, issued: null, error: null, list: { status: 'idle' }, proposing: false, proposeError: null, revokingId: null, revokeError: null };

/** A client timeout / network failure / 5xx is not proof the step failed: SecurePay may already have created it. */
const isUncertain = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
export const UNCERTAIN = 'SecurePay couldn’t confirm whether that went through.';

export const normalizeKs = (value: string) => value.trim().replace(/\s+/g, '');
export const isPlausibleKs = (value: string) => /^[A-Za-z0-9-]{3,24}$/.test(normalizeKs(value));

/** What a definite rejection may truthfully say. Raw backend text is never shown. */
export function inviteRejection(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session ended before SecurePay could act on this. No invitation was created. Sign in again, then try again.';
    if (error.status === 403) return 'This account can’t invite people to this Agreement. No invitation was created.';
    if (error.status === 409) return 'This request conflicts with an earlier one for this Agreement. No new invitation was created.';
    const said = error.kind === 'http' ? error.message.toLowerCase() : '';
    if (said.includes('only creator')) return 'Only the person who created this Agreement can invite people to it. No invitation was created.';
    if (said.includes('cannot issue invitations') || said.includes('status')) return 'This Agreement isn’t in a state where invitations can be created. No invitation was created.';
    if (error.status === 422 || error.status === 400) return 'SecurePay couldn’t accept that invitation. Check the KS Number and role. No invitation was created.';
  }
  return 'SecurePay couldn’t create the invitation. No invitation was created.';
}

/**
 * Creator-side invitation orchestration for ONE Agreement. Issuing is an explicit action only; it creates an invitation
 * (a doorway) and nothing else: it does not add a participant who has joined, send anything, or ask anyone to confirm.
 */
export function createInviteController(gateway: Pick<AgreementGateway, 'propose' | 'invitations' | 'revokeInvitation' | 'issueInvitation' | 'lookupInvitationTargetByKsNumber'>, agreementId: string, origin: string, onAgreementChanged: () => void = () => {}, id = () => crypto.randomUUID()) {
  let state: InviteState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<InviteState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  const linkFor = (token: string) => `${origin}/#/invitation/${encodeURIComponent(token)}`;
  let previewToken = 0; // guards against a slow, superseded lookup overwriting a newer one's result

  async function loadList() {
    update({ list: { status: 'loading' } });
    try { update({ list: { status: 'ready', items: await gateway.invitations(agreementId) } }); }
    catch { update({ list: { status: 'error' } }); }
  }

  return {
    getSnapshot: (): InviteState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    loadList,

    open() { if (state.phase === 'closed') update({ phase: 'form', error: null }); },
    setRole(roleCode: string) { if (state.phase === 'form' || state.phase === 'error') update({ roleCode }); },
    /** Editing the field always invalidates any earlier preview -- a stale "found" must never survive an edited number. */
    setKs(ksNumber: string) { if (state.phase === 'form' || state.phase === 'error') update({ ksNumber, ksPreview: { status: 'idle' } }); },

    /**
     * KS001 Upgrade Phase 4 (Section 10) -- the creator's own explicit "check this KS Number" step,
     * before issuance is ever allowed. A 404 means "no such active identity" (Section 15's own
     * anti-enumeration doctrine folds this together with "known but ineligible"); any other failure is
     * shown as a plain, retryable check error, never confused with "not found."
     */
    async checkKs() {
      if (state.phase !== 'form' && state.phase !== 'error') return;
      const normalized = normalizeKs(state.ksNumber);
      if (!isPlausibleKs(normalized)) return;
      const token = ++previewToken;
      update({ ksPreview: { status: 'checking', checked: normalized } });
      try {
        const target = await gateway.lookupInvitationTargetByKsNumber(agreementId, normalized);
        if (token !== previewToken) return; // superseded by a later edit/check
        update({ ksPreview: { status: 'found', checked: normalized, target } });
      } catch (error) {
        if (token !== previewToken) return;
        if (error instanceof ApiError && error.status === 404) { update({ ksPreview: { status: 'not-found', checked: normalized } }); return; }
        update({ ksPreview: { status: 'error', checked: normalized } });
      }
    },

    /** Draft -> Proposed: the ONLY step before invitations are allowed. Idempotent on the server. Invites nobody. */
    async propose() {
      if (state.proposing) return;
      update({ proposing: true, proposeError: null });
      try { await gateway.propose(agreementId); update({ proposing: false }); onAgreementChanged(); }
      catch (error) { update({ proposing: false, proposeError: isUncertain(error) ? `${UNCERTAIN} Trying again is safe.` : 'SecurePay couldn’t do that. Nothing was changed.' }); }
    },

    /**
     * Only an explicit press may reach this. An uncertain outcome retries the SAME request (same key,
     * same body). Section 10 -- requires a CURRENT confirmed preview (the exact KS Number just checked,
     * not merely a plausibly-shaped string) before issuance is ever attempted; the server independently
     * re-resolves the same KS Number at issuance regardless (this is a UX gate, never the authority).
     */
    async issue() {
      if (!['form', 'error', 'uncertain'].includes(state.phase)) return;
      const normalized = normalizeKs(state.ksNumber);
      const previewConfirmed = state.ksPreview.status === 'found' && state.ksPreview.checked === normalized;
      const request = state.request ?? (state.roleCode && previewConfirmed ? { key: id(), roleCode: state.roleCode, ksNumber: normalized } : null);
      if (!request) return;
      update({ phase: 'issuing', error: null, request });
      try {
        const result = await gateway.issueInvitation(agreementId, { idempotencyKey: request.key, roleCode: request.roleCode, intendedKsNumber: request.ksNumber });
        // Success releases the retry sequence: the next explicit invitation gets a fresh key.
        update({ request: null, issued: { invitationId: result.invitationId, link: result.invitationToken ? linkFor(result.invitationToken) : null }, phase: result.invitationToken ? 'issued' : 'issued-earlier' });
        void loadList(); onAgreementChanged();
      } catch (error) {
        if (isUncertain(error)) { update({ phase: 'uncertain', error: UNCERTAIN }); return; }
        // A definite rejection: nothing was created, so the request (and its key) is released.
        update({ phase: 'error', request: null, error: inviteRejection(error) });
      }
    },

    /** Ends the retry sequence and forgets the link. A later invitation is a new action with a fresh key. */
    reset() { update({ phase: 'closed', roleCode: null, ksNumber: '', ksPreview: { status: 'idle' }, request: null, issued: null, error: null }); },

    /** Revoking stops the link working; it never removes someone who has already joined. Idempotent on the server. */
    async revoke(invitationId: string) {
      if (state.revokingId) return;
      update({ revokingId: invitationId, revokeError: null });
      try { await gateway.revokeInvitation(agreementId, invitationId); update({ revokingId: null }); }
      catch (error) { update({ revokingId: null, revokeError: isUncertain(error) ? `${UNCERTAIN} The list below shows what SecurePay has.` : 'SecurePay couldn’t revoke that invitation.' }); }
      await loadList();
    },
  };
}
export type InviteController = ReturnType<typeof createInviteController>;
