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
  'propose', 'issueInvitation', 'invitations', 'revokeInvitation',
  // Amendments (list, structured diff, apply / reject / withdraw)
  'amendments', 'amendmentDiff', 'applyAmendment', 'rejectAmendment', 'withdrawAmendment',
  // Plug / referral attribution
  'attributePlug', 'plugAttribution', 'referralStatus',
  // Living Agreement enrichments
  'milestoneEffectiveStates', 'calendarEvents', 'calendarConflicts', 'myCalendar', 'tagsForAgreement', 'tagAgreement', 'untagAgreement', 'myTags',
] as const satisfies readonly (keyof AgreementGateway)[];
