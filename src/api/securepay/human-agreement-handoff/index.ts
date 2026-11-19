import type { HttpClient } from '../http';

/**
 * H4E: a real, distinct, canonical PROPOSED Agreement, never a directly
 * issued SecureLink or a completed payment. Only the original H4D requester
 * can create/read this handoff. No source Agreement or provider credentials.
 */
export interface HumanCanonicalHandoff {
  humanEngagementId:string;
  canonicalAgreementId:string;
  initialAgreementVersionId:string;
  initialContentHash:string;
  publicReference:string;
  currentAgreementStatus:string;
  exactInitialVersionStillCurrent:boolean;
  canonicalAgreementProposed:true;
  bothPartiesConfirmedCanonicalVersion:false;
  publicSecureLinkIssued:false;
  workAuthorized:false;
  originalAgreementAccessGranted:false;
  moneyAuthorized:false;
  nextHumanStep:string;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const obj=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
function verify(raw:unknown,id:string):HumanCanonicalHandoff {
  if(!obj(raw)
      ||raw.humanEngagementId!==id
      ||typeof raw.canonicalAgreementId!=='string'||!UUID.test(raw.canonicalAgreementId)
      ||typeof raw.initialAgreementVersionId!=='string'||!UUID.test(raw.initialAgreementVersionId)
      ||typeof raw.initialContentHash!=='string'||raw.initialContentHash.length<8
      ||raw.initialContentHash.length>128
      ||typeof raw.publicReference!=='string'||raw.publicReference.length<4
      ||raw.publicReference.length>80
      ||typeof raw.currentAgreementStatus!=='string'
      ||typeof raw.exactInitialVersionStillCurrent!=='boolean'
      ||raw.canonicalAgreementProposed!==true
      ||raw.bothPartiesConfirmedCanonicalVersion!==false
      ||raw.publicSecureLinkIssued!==false
      ||raw.workAuthorized!==false
      ||raw.originalAgreementAccessGranted!==false
      ||raw.moneyAuthorized!==false
      ||typeof raw.nextHumanStep!=='string'||raw.nextHumanStep.length>500)
    throw new Error('H4E did not return a valid, nonfunded canonical Agreement');
  return raw as unknown as HumanCanonicalHandoff;
}
export function createHumanCanonicalHandoffGateway(http:Pick<HttpClient,'request'>) {
  return {
    async propose(engagementId:string):Promise<HumanCanonicalHandoff> {
      if(!UUID.test(engagementId))throw new Error('Select an exact reviewed H4D request');
      const raw=await http.request<unknown>(
        '/api/v1/human-layer/engagements/'+engagementId+'/agreement-draft',{
          method:'POST',auth:'required'
        });
      const proof=verify(raw,engagementId);
      if(!proof.exactInitialVersionStillCurrent||proof.currentAgreementStatus!=='PROPOSED')
        throw new Error('The new Agreement changed; read the current canonical version');
      return proof;
    },
    async mine(engagementId:string):Promise<HumanCanonicalHandoff> {
      if(!UUID.test(engagementId))throw new Error('Select an exact H4D request');
      return verify(await http.request<unknown>(
        '/api/v1/human-layer/engagements/'+engagementId+'/agreement-draft',{
          method:'GET',auth:'required'
        }),engagementId);
    }
  };
}
export type HumanCanonicalHandoffGateway=ReturnType<typeof createHumanCanonicalHandoffGateway>;
