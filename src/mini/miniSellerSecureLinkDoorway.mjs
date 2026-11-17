/**
 * Seller SecureLink Phase 4: the existing canonical Agreement doorway.
 * Store offer IDs and local proposals are NOT Agreement IDs.
 * No designer/theme inputs. No client-derived public URL or raw slug.
 */
export async function miniSellerIssueAgreementDoorway({
  gateway, agreement, idempotencyKey, confirmed
}) {
  if (!confirmed) return {ok:false,reason:'EXPLICIT_SHARE_CHOICE_REQUIRED'};
  if (!gateway || typeof gateway.issuePublicDoorway!=='function'
      || typeof gateway.activeDoorway!=='function')
    return {ok:false,reason:'AGREEMENT_GATEWAY_REQUIRED'};
  if (!agreement || typeof agreement.id!=='string'
      || !/^[0-9a-fA-F-]{36}$/.test(agreement.id))
    return {ok:false,reason:'CANONICAL_AGREEMENT_REQUIRED'};
  // SecureLink may only be issued once the backend agreement has genuinely
  // reached an authorized shareable state. Client status isn't authority:
  // backend independently rechecks the same condition on the issue call.
  if (!['PROPOSED','INVITATION_PENDING','PARTICIPANTS_JOINING','CONFIRMATION_PENDING']
      .includes(agreement.status))
    return {ok:false,reason:'AGREEMENT_NOT_PROPOSED'};
  if (typeof idempotencyKey!=='string'
      || !/^[0-9a-fA-F-]{36}$/.test(idempotencyKey))
    return {ok:false,reason:'RETRY_KEY_REQUIRED'};
  try {
    const active=await gateway.activeDoorway(agreement.id);
    if (active?.hasActiveLocator) {
      // Existing locator's plaintext slug/URL is intentionally unrecoverable.
      // Never issue a second one or fabricate a URL on behalf of the seller.
      return {ok:false,reason:'EXISTING_SECURELINK_MANAGE_IN_AGREEMENT'};
    }
    const result=await gateway.issuePublicDoorway(agreement.id,idempotencyKey);
    if (!result || typeof result.slug!=='string' || !result.slug.trim()
        || result.pathClass!=='AGREEMENT_DOORWAY'
        || !['ACTIVE','ISSUED'].includes(result.status)) {
      return {ok:false,reason:'SERVER_LINK_RESPONSE_UNCONFIRMED'};
    }
    const url=result.publicUrl;
    // A URL must be explicitly returned by the authorized SecurePay server;
    // do not compose one from hostnames, offer ID, agreement ID or slug.
    if (url!==null && (typeof url!=='string' || !/^https:\/\/[^\s/]+\/\S+$/i.test(url)))
      return {ok:false,reason:'SERVER_LINK_URL_UNUSABLE'};
    return {
      ok:true,slug:result.slug,publicUrl:url,
      sent:false,buyerAccepted:false,moneyAuthorized:false,
      agreementId:agreement.id
    };
  } catch (error) {
    // Don't discard caller's idempotencyKey. Reuse it after uncertain
    // outcomes, including if activeDoorway read failed.
    return {ok:false,reason:'CHECK_AGREEMENT_BEFORE_RETRY',retryKey:idempotencyKey};
  }
}
