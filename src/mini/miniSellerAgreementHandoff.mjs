/**
 * Phase 4 seller -> real Agreement, using the existing KS001 handoff protocol.
 *
 * No raw local Mini draft is posted as an Agreement: the canonical candidate
 * must exist in a SERVER-SAVED KS001 conversation, be shown for review, and
 * be progressed against its exact server-owned version + candidate digest.
 * Every progression is an explicit seller action. This NEVER proposes,
 * invites, issues SecureLinks or initiates Money.
 */
const isId = value => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const isVersion = value => Number.isSafeInteger(value) && value >= 0;
const ready = status => status === 'READY_FOR_REVIEW' || status === 'READY_TO_PROGRESS';
const known = new Set(['IDENTITY_REQUIRED','NEEDS_RESOLUTION','REVIEW_STALE',
  'READY_FOR_REVIEW','READY_TO_PROGRESS','PROGRESSED','EXPIRED']);

/** Caller retains this SAME action ID if creation's network outcome is uncertain. */
export async function miniSellerBeginAgreementHandoff({
  gateway,conversationId,reviewedTradeContextVersion,clientActionId,confirmed
}) {
  if (!confirmed) return {ok:false,reason:'SELLER_ACTION_REQUIRED'};
  if (!isId(conversationId) || !isId(clientActionId) || !isVersion(reviewedTradeContextVersion))
    return {ok:false,reason:'SAVED_CONVERSATION_VERSION_REQUIRED'};
  if (typeof gateway?.createHandoff !== 'function')
    return {ok:false,reason:'AUTHENTICATED_HANDOFF_GATEWAY_REQUIRED'};
  try {
    const handoff = await gateway.createHandoff(
      conversationId,clientActionId,reviewedTradeContextVersion
    );
    if (!isId(handoff?.handoffId) || handoff.conversationId !== conversationId ||
        !known.has(handoff.status) || !isVersion(handoff.tradeContextVersion) ||
        !handoff.candidateDigest) {
      return {ok:false,reason:'INVALID_SERVER_HANDOFF',retryKey:clientActionId};
    }
    return {ok:true,handoffId:handoff.handoffId,status:handoff.status,
      conversationId,reviewRequired:true,agreementCreated:false,moneyAuthorized:false};
  } catch {
    return {ok:false,reason:'CHECK_EXISTING_HANDOFF_BEFORE_RETRY',
      retryKey:clientActionId};
  }
}

/**
 * Read the actual server review. It is NOT a screenshot of the local proposal.
 * The view is only eligible for progression after the backend marks the
 * reviewed handoff READY_TO_PROGRESS and there are no blocking matters.
 */
export async function miniSellerReviewAgreementHandoff({gateway,handoffId}) {
  if (!isId(handoffId) || typeof gateway?.reviewHandoff !== 'function' ||
      typeof gateway?.readHandoff !== 'function')
    return {ok:false,reason:'AUTHORIZED_HANDOFF_REQUIRED'};
  try {
    const review=await gateway.reviewHandoff(handoffId);
    const current=await gateway.readHandoff(handoffId);
    if (current?.handoffId!==handoffId || !isId(current?.conversationId) ||
        !known.has(current?.status) || !isVersion(current.tradeContextVersion) ||
        typeof current.candidateDigest!=='string' || !current.candidateDigest ||
        !review?.agreementCandidateSummary) {
      return {ok:false,reason:'HANDOFF_REVIEW_UNAVAILABLE'};
    }
    const summary=review.agreementCandidateSummary;
    const state=current.status;
    const source=current.reviewedSource;
    const usable=state==='READY_TO_PROGRESS' &&
      Array.isArray(current.mustResolve) && current.mustResolve.length===0 &&
      (source==null || source.sourceStatus==='CURRENT');
    return {
      ok:true,canProgress:usable,handoffId,
      status:state,conversationId:current.conversationId,
      review,reviewedSource:source??null,
      mustResolve:current.mustResolve??[],
      stillToDecide:current.stillToDecide??[],
      snapshot:{expectedTradeContextVersion:current.tradeContextVersion,
        expectedCandidateDigest:current.candidateDigest},
      candidate:summary,agreementCreated:false
    };
  } catch {
    return {ok:false,reason:'HANDOFF_REVIEW_UNAVAILABLE'};
  }
}

/** Explicit follow-on click; server rejects stale version/digest. */
export async function miniSellerCreateReviewedAgreement({
  gateway,agreements,reviewed,sellerConfirmed
}) {
  if (!sellerConfirmed) return {ok:false,reason:'SELLER_CONFIRMATION_REQUIRED'};
  if (!reviewed?.ok || !reviewed.canProgress || !isId(reviewed.handoffId) ||
      typeof gateway?.readHandoff!=='function' ||
      typeof gateway?.continueHandoff!=='function' ||
      typeof agreements?.detail!=='function')
    return {ok:false,reason:'CANONICAL_REVIEW_REQUIRED'};
  const snapshot=reviewed.snapshot;
  if (!isVersion(snapshot?.expectedTradeContextVersion) ||
      typeof snapshot.expectedCandidateDigest!=='string' ||
      !snapshot.expectedCandidateDigest)
    return {ok:false,reason:'CANONICAL_REVIEW_REQUIRED'};
  try {
    const current=await gateway.readHandoff(reviewed.handoffId);
    if (current?.handoffId!==reviewed.handoffId ||
        current.conversationId!==reviewed.conversationId ||
        current.status!=='READY_TO_PROGRESS' ||
        current.tradeContextVersion!==snapshot.expectedTradeContextVersion ||
        current.candidateDigest!==snapshot.expectedCandidateDigest ||
        !Array.isArray(current.mustResolve) || current.mustResolve.length ||
        (current.reviewedSource!=null && current.reviewedSource.sourceStatus!=='CURRENT')) {
      return {ok:false,reason:'REVIEW_CHANGED_REFRESH_REQUIRED'};
    }
    // Handoff progression is idempotent on the frozen server snapshot.
    const progressed=await gateway.continueHandoff(reviewed.handoffId,snapshot);
    if (progressed?.handoffId!==reviewed.handoffId ||
        progressed?.status!=='PROGRESSED' ||
        !isId(progressed.progressedAgreementId)) {
      return {ok:false,reason:'AGREEMENT_NOT_CONFIRMED_CHECK_HANDOFF'};
    }
    const detail=await agreements.detail(progressed.progressedAgreementId);
    if (detail?.overview?.agreementId!==progressed.progressedAgreementId ||
        detail.overview.status!=='DRAFT' || !detail.currentVersion) {
      return {ok:false,reason:'CHECK_AGREEMENT_BEFORE_SHARE'};
    }
    return {ok:true,agreementId:detail.overview.agreementId,
      status:'DRAFT',agreementVersion:detail.currentVersion,
      shared:false,proposed:false,secureLinkIssued:false,moneyAuthorized:false};
  } catch {
    // Never begin an unrelated handoff or make up an Agreement ID. A failure
    // could have committed the draft: read the SAME handoff before retrying.
    return {ok:false,reason:'CHECK_HANDOFF_BEFORE_RETRY',handoffId:reviewed.handoffId};
  }
}

/** Proposal is a separate seller decision; it never issues the SecureLink. */
export async function miniSellerProposeAgreement({agreements,agreementId,confirmed}) {
  if (!confirmed) return {ok:false,reason:'SELLER_CONFIRMATION_REQUIRED'};
  if (!isId(agreementId) || typeof agreements?.detail!=='function' ||
      typeof agreements?.propose!=='function')
    return {ok:false,reason:'CANONICAL_AGREEMENT_REQUIRED'};
  try {
    const current=await agreements.detail(agreementId);
    if (current?.overview?.agreementId!==agreementId ||
        !current.currentVersion || current.overview.status!=='DRAFT')
      return {ok:false,reason:'REVIEW_AGREEMENT_BEFORE_PROPOSING'};
    const proposed=await agreements.propose(agreementId);
    if (proposed?.id!==agreementId || proposed.status!=='PROPOSED')
      return {ok:false,reason:'PROPOSAL_NOT_CONFIRMED'};
    return {ok:true,agreementId,status:'PROPOSED',
      secureLinkIssued:false,buyerAccepted:false,moneyAuthorized:false};
  } catch {
    return {ok:false,reason:'CHECK_AGREEMENT_BEFORE_RETRY'};
  }
}
