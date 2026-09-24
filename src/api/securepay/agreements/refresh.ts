import type { AgreementGateway } from './index';

/**
 * Every AgreementGateway method whose contract is `auth: 'required'`, so the one session boundary refreshes an
 * expired-but-refreshable access token BEFORE the call instead of surfacing a 401. `invitation(token)` is the public
 * doorway (`auth: 'none'`) and is deliberately absent. A guard test compares this list against the gateway source, so
 * adding an authenticated method without listing it here fails loudly.
 */
export const AUTHENTICATED_AGREEMENT_METHODS = [
  // Hub / Home / Detail
  'currentUserAgreements', 'currentUserActions', 'hub', 'home', 'detail', 'confirmationStatus', 'confirmations', 'participants',
  // Recipient: Join, exact version review, confirmation
  'join', 'versions', 'version', 'confirmVersion',
  // Creator invitations
  'propose', 'issueInvitation', 'invitations', 'revokeInvitation', 'lookupInvitationTargetByKsNumber',
  // KS001 Upgrade Phase 4 (Section 7) -- the server-owned People projection
  'people',
  // KS001 Upgrade Phase 4 continuation (Section 21/23) -- the self-scoped invitation inbox
  'myInvitations', 'viewMyInvitation', 'joinMyInvitation',
  // Execution (obligations, completion status, start, complete, evidence list + review, next actions)
  'obligations', 'obligationCompletionStatus', 'startObligation', 'completeObligation', 'obligationEvidence', 'reviewEvidence', 'myNextActions',
  // Amendments (list, structured diff, apply / reject / withdraw)
  'amendments', 'amendmentDiff', 'applyAmendment', 'rejectAmendment', 'withdrawAmendment',
  // Plug / referral attribution
  'attributePlug', 'plugAttribution', 'referralStatus',
  // Living Agreement enrichments
  'milestoneEffectiveStates', 'calendarEvents', 'calendarConflicts', 'myCalendar', 'tagsForAgreement', 'tagAgreement', 'untagAgreement', 'myTags',
  // KS001 Upgrade Phase 5 (SecureLink & Money Continuation) -- product activation, locator issuance, and
  // the authenticated join-authority bridge. `viewSecureLink` is the public doorway (`auth: 'none'`) and
  // is deliberately absent, exactly like `invitation(token)` above.
  'activateProduct', 'issuePublicLocator', 'requestSecureLinkJoinAuthority',
  // KS001 Upgrade Phase 5 continuation (Slice 2) -- SecureLink lifecycle management (existence read,
  // replace/rotate, revoke). `viewSecureLink` remains the only no-auth SecureLink method.
  'activeLocator', 'rotatePublicLocator', 'revokePublicLocator',
] as const satisfies readonly (keyof AgreementGateway)[];
