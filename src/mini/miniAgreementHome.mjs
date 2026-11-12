/**
 * M4: read-only, owner-scoped projections of canonical SecurePayAPI replies.
 * This module does not decide contract, identity, money or milestone truth.
 * Every field must be present in the API reply; absence fails closed.
 */
const nonBlank=x=>typeof x==='string'&&x.trim().length>0;
const text=(x,fallback)=>nonBlank(x)?x.trim():fallback;
const array=Array.isArray;
const knownStatus=Object.freeze({
  DRAFT:'Draft Agreement', PROPOSED:'Proposed',
  INVITATION_PENDING:'Invitations pending',
  PARTICIPANTS_JOINING:'People joining',
  PENDING_CONFIRMATION:'Waiting for confirmations',
  CONFIRMATION_PENDING:'Waiting for confirmations',
  ACTIVE:'Active', IN_PROGRESS:'In progress',
  COMPLETED:'Completed', CANCELLED:'Cancelled',
  CANCELED:'Cancelled', EXPIRED:'Expired',
});
export const miniAgreementStatus=code=>nonBlank(code)&&knownStatus[code]?knownStatus[code]:'Status needs checking';
const action=a=>a&&nonBlank(a.actionCode)&&nonBlank(a.reason)?({
  actionCode:a.actionCode, reason:a.reason.trim(),
  deadline:nonBlank(a.deadline)?a.deadline:null,
  attentionClass:nonBlank(a.attentionClass)?a.attentionClass:null,
}):null;
/**
 * List pages are about EXISTING Agreements only, not saved chat builds or
 * invitations. Missing or forged authority cannot render a private card.
 */
export function miniAgreementHomePage(response,expectedPage=0){
  if(!response||!array(response.items)||response.items.length>20||
     !Number.isInteger(response.page)||response.page!==expectedPage||
     !Number.isInteger(response.size)||response.size<1||response.size>20||
     response.items.length>response.size||
     !Number.isInteger(response.totalElements)||response.totalElements<0) return null;
  const seen=new Set();
  const items=[];
  for(const a of response.items){
    if(!a||!nonBlank(a.agreementId)||seen.has(a.agreementId)||
      !nonBlank(a.currentAgreementVersionId)||!nonBlank(a.status)||
      !a.currentActor||!nonBlank(a.currentActor.roleCode)||
      !nonBlank(a.currentActor.participantStatus)||
      typeof a.attentionRequired!=='boolean'||
      !array(a.nextActions))return null;
    seen.add(a.agreementId);
    const actions=a.nextActions.map(action);
    if(actions.some(x=>x===null))return null;
    items.push({
      id:a.agreementId, versionId:a.currentAgreementVersionId,
      title:text(a.title,'Agreement'),
      reference:text(a.publicReference,null),
      statusCode:a.status,statusText:miniAgreementStatus(a.status),
      attentionRequired:a.attentionRequired,
      role:a.currentActor.roleCode,
      participantStatus:a.currentActor.participantStatus,
      actions,
      nextDeadline:nonBlank(a.nextDeadline)?a.nextDeadline:null,
      lastUpdated:nonBlank(a.updatedAt)?a.updatedAt:null,
    });
  }
  return {
    items, page:response.page, size:response.size,
    total:response.totalElements,
    hasMore:(response.page+1)*response.size<response.totalElements,
  };
}
/**
 * Only a successful owner-authorised GET /agreements/{id}/detail supplies
 * this. We deliberately never call a Money rail, invent an approval, or
 * interpret an obligation's PENDING status as overdue.
 */
export function miniAgreementDetailView(dto,expectedId){
  if(!dto||!dto.overview||dto.overview.agreementId!==expectedId||
    !nonBlank(expectedId)||!nonBlank(dto.overview.status)||
    !array(dto.participants)||!array(dto.milestones)||
    !array(dto.terms)||!array(dto.activity)||
    !array(dto.versionHistory)||!dto.money)return null;
  const participants=[];
  for(const p of dto.participants){
    if(!p||!nonBlank(p.participantId)||!nonBlank(p.roleCode)||
       !nonBlank(p.participantStatus))return null;
    participants.push({
      id:p.participantId,
      name:text(p.displayName,'Participant'),
      role:p.roleCode,
      status:p.participantStatus,
      // The DTO may contain a KS Number; this compact layer intentionally
      // never copies or displays other people's identifying numbers.
    });
  }
  const milestones=[];
  for(const m of dto.milestones){
    if(!m||!nonBlank(m.milestoneId)||!nonBlank(m.title)||
      !nonBlank(m.status))return null;
    milestones.push({
      id:m.milestoneId,title:m.title,status:m.status,
      description:text(m.description,null),
      dueAt:nonBlank(m.dueAt)?m.dueAt:null,
    });
  }
  const terms=[];
  for(const t of dto.terms){
    if(!t||!nonBlank(t.obligationId)||!nonBlank(t.title)||
      !nonBlank(t.status))return null;
    terms.push({id:t.obligationId,title:t.title,
      description:text(t.description,null),status:t.status});
  }
  return {
    id:expectedId,title:text(dto.overview.title,'Agreement'),
    reference:text(dto.overview.publicReference,null),
    statusCode:dto.overview.status,
    statusText:miniAgreementStatus(dto.overview.status),
    purpose:text(dto.overview.purpose,null),
    currentVersion:dto.currentVersion&&Number.isInteger(dto.currentVersion.versionNumber)
       &&nonBlank(dto.currentVersion.versionId)
      ? {id:dto.currentVersion.versionId,number:dto.currentVersion.versionNumber}
      : null,
    participants, milestones,terms,
    moneyStatus:nonBlank(dto.money.status)?dto.money.status:null,
    activityCount:dto.activity.length,
  };
}
