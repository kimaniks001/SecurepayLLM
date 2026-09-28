import type { CommunityGateway } from '../../api/securepay/community';
import type { BusinessMembershipResponse, FairTradePrincipleResponse, MembershipResponse, OrganizationMembershipResponse } from '../../api/securepay/community/dto';
import { ApiError } from '../../api/securepay/http';

/**
 * Public Experience Convergence Phase 4 (ADR-0021) -- the Join page's state machine.
 *
 * Membership only. It reads the versioned canonical 12 Principles and the caller's own membership, and joins
 * ONLY after an explicit acceptance control is ticked, naming the exact version that was displayed. A stale
 * version re-fetches the Principles and requires acceptance again -- a newer version is never accepted
 * silently. Signing in, signing up and opening this page are never acceptance.
 *
 * Conversation continuity (Phase 3) is a SEPARATE authority, run only after membership succeeds: a claim
 * failure never rolls membership back, and membership never depends on a conversation existing.
 */
export type ContinuationOutcome =
  | { kind: 'none' }
  | { kind: 'claimed'; conversationId: string }
  | { kind: 'failed' };

/**
 * Phase 4C (API ADR-0023) -- whose membership this page decides. `self` is the signed-in person (the Phase 4A Join,
 * unchanged). `business` is a Business the person acts for, taken from the capacity SecurePay confirmed in the
 * Business area. It only NAMES the Business: SecurePay re-proves the right to decide on every read and Join.
 */
export type JoinTarget =
  | { kind: 'self' }
  | { kind: 'business'; businessKsNumber: string; displayName: string | null }
  /** Phase 4D (API ADR-0024) -- an Organization KS the person acts for; the same rules as a Business, its own calls. */
  | { kind: 'organization'; organizationKsNumber: string; displayName: string | null };

export interface JoinState {
  principles: { status: 'loading' | 'ready' | 'error'; version: string | null; label: string | null; items: FairTradePrincipleResponse[] };
  membership: { status: 'idle' | 'loading' | 'ready' | 'error'; value: MembershipResponse | null };
  accepted: boolean;
  phase: 'idle' | 'joining' | 'joined';
  error: string | null;
  staleNotice: boolean;
  continuation: ContinuationOutcome | { kind: 'claiming' } | null;
  /** Business target only: whether SecurePay says this person may make the Business's decision (null = unknown). */
  canManage: boolean | null;
  /** Business target only: SecurePay no longer confirms this person acts for the Business (404/403). */
  authorityLost: boolean;
}

const initial: JoinState = {
  principles: { status: 'loading', version: null, label: null, items: [] },
  membership: { status: 'idle', value: null },
  accepted: false,
  phase: 'idle',
  error: null,
  staleNotice: false,
  continuation: null,
  canManage: null,
  authorityLost: false,
};

export type MembershipKind = 'none' | 'invited' | 'active' | 'declined' | 'revoked';
export function membershipKind(value: MembershipResponse | null): MembershipKind {
  switch (value?.status) {
    case 'INVITED': return 'invited';
    case 'ACTIVE': return 'active';
    case 'DECLINED': return 'declined';
    case 'REVOKED': return 'revoked';
    default: return 'none';
  }
}

function joinErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'TRUST_PROJECT_MEMBERSHIP_NOT_AVAILABLE') return 'Joining isn’t available for this KS Number. If you think this is a mistake, use Help & Support.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) {
      return 'SecurePay couldn’t confirm that just now. You may or may not have joined — trying again is safe and never joins twice.';
    }
  }
  return 'That didn’t work. You haven’t joined yet.';
}

const lostAuthority = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 403);

export function createJoinController(
  community: Pick<CommunityGateway, 'currentPrinciples'> & {
    membership: Pick<CommunityGateway['membership'], 'me' | 'join'>
      & Partial<Pick<CommunityGateway['membership'], 'business' | 'joinBusiness' | 'organization' | 'joinOrganization'>>;
  },
  continueConversation: () => Promise<ContinuationOutcome> = async () => ({ kind: 'none' }),
  newKey: () => string = () => `trust-project-join-${crypto.randomUUID()}`,
  target: JoinTarget = { kind: 'self' },
) {
  let state: JoinState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<JoinState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  // One key per logical Join attempt: a retry after an uncertain outcome reuses it and can never join twice.
  let attemptKey: string | null = null;

  async function loadPrinciples() {
    update({ principles: { ...state.principles, status: 'loading' } });
    try {
      const current = await community.currentPrinciples();
      update({ principles: { status: 'ready', version: current.version, label: current.label, items: current.principles } });
    } catch {
      update({ principles: { status: 'error', version: null, label: null, items: [] } });
    }
  }

  return {
    target,
    getSnapshot: (): JoinState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    loadPrinciples,

    /** Signed-in only. Never mutates. */
    async loadMembership() {
      update({ membership: { status: 'loading', value: state.membership.value } });
      if (target.kind === 'business' || target.kind === 'organization') {
        try {
          const read: BusinessMembershipResponse | OrganizationMembershipResponse = target.kind === 'business'
            ? await community.membership.business!(target.businessKsNumber)
            : await community.membership.organization!(target.organizationKsNumber);
          update({ membership: { status: 'ready', value: read.membership }, canManage: read.canManage, authorityLost: false });
        } catch (error) {
          if (lostAuthority(error)) update({ membership: { status: 'ready', value: null }, canManage: false, authorityLost: true });
          else update({ membership: { status: 'error', value: null } });
        }
        return;
      }
      try {
        update({ membership: { status: 'ready', value: await community.membership.me() } });
      } catch {
        update({ membership: { status: 'error', value: null } });
      }
    },

    /** Signing out (or a different person signing in) forgets everything personal. */
    resetPersonal() {
      attemptKey = null;
      update({ membership: { status: 'idle', value: null }, accepted: false, phase: 'idle', error: null, continuation: null, canManage: null, authorityLost: false });
    },

    setAccepted(accepted: boolean) {
      if (state.phase !== 'idle') return;
      update({ accepted, error: null });
    },

    async join() {
      const version = state.principles.version;
      if (state.phase !== 'idle' || !state.accepted || !version) return;
      const kind = membershipKind(state.membership.value);
      if (kind === 'active' || kind === 'revoked') return;
      if (target.kind !== 'self' && (state.canManage !== true || state.authorityLost)) return;
      attemptKey ??= newKey();
      update({ phase: 'joining', error: null, staleNotice: false });
      let joined: MembershipResponse;
      try {
        joined = target.kind === 'business'
          ? (await community.membership.joinBusiness!(target.businessKsNumber, version, attemptKey)).membership
          : target.kind === 'organization'
            ? (await community.membership.joinOrganization!(target.organizationKsNumber, version, attemptKey)).membership
            : await community.membership.join(version, attemptKey);
      } catch (error) {
        if (target.kind !== 'self' && lostAuthority(error)) {
          // SecurePay no longer confirms this person may decide for the Business or Organization: nothing was joined.
          attemptKey = null;
          update({ phase: 'idle', accepted: false, canManage: false, authorityLost: true, error: null });
          return;
        }
        if (error instanceof ApiError && error.code === 'TRUST_PROJECT_PRINCIPLES_VERSION_STALE') {
          attemptKey = null;
          update({ phase: 'idle', accepted: false, staleNotice: true });
          await loadPrinciples();
          return;
        }
        if (error instanceof ApiError && error.code === 'TRUST_PROJECT_MEMBERSHIP_NOT_AVAILABLE') {
          update({ phase: 'idle', accepted: false, error: joinErrorText(error) });
          return;
        }
        update({ phase: 'idle', error: joinErrorText(error) });
        return;
      }
      attemptKey = null;
      if (target.kind !== 'self') {
        // Conversation continuity belongs to the person, never to a Business or Organization decision.
        update({ phase: 'joined', membership: { status: 'ready', value: joined }, continuation: { kind: 'none' } });
        return;
      }
      update({ phase: 'joined', membership: { status: 'ready', value: joined }, continuation: { kind: 'claiming' } });
      // Separate authority: whatever happens here, the membership above stands.
      let outcome: ContinuationOutcome;
      try {
        outcome = await continueConversation();
      } catch {
        outcome = { kind: 'failed' };
      }
      update({ continuation: outcome });
    },
  };
}
export type JoinController = ReturnType<typeof createJoinController>;
