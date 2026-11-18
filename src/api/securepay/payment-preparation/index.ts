import type {HttpClient} from '../http';

/**
 * Non-Money permission read shared by Mini / SecurePay for Business / Living Workspace.
 * Authority belongs to one specific Agreement monetary obligation, never the worker
 * or manager's whole employer account. Every future write must revalidate it server-side.
 */
export interface PaymentPreparationAuthority {
  agreementId:string;
  currentAgreementVersionId:string|null;
  obligationId:string;
  capacity:'PERSONAL'|'BUSINESS'|'DELEGATED'|'UNAUTHORIZED';
  canPrepare:boolean;
  canAuthorizeMoney:false;
  nextStep:string;
}
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function verifyPreparationAuthority(
  raw:unknown,agreementId:string,obligationId:string):PaymentPreparationAuthority|null {
  if(!object(raw)||raw.agreementId!==agreementId||raw.obligationId!==obligationId||
    (raw.currentAgreementVersionId!==null&&!uuid.test(String(raw.currentAgreementVersionId)))||
    !['PERSONAL','BUSINESS','DELEGATED','UNAUTHORIZED'].includes(String(raw.capacity))||
    typeof raw.canPrepare!=='boolean'||raw.canAuthorizeMoney!==false||
    typeof raw.nextStep!=='string'||!raw.nextStep.trim()||raw.nextStep.length>500||
    (raw.canPrepare===true&&(raw.currentAgreementVersionId===null||
      raw.capacity==='UNAUTHORIZED')))return null;
  return raw as unknown as PaymentPreparationAuthority;
}
export function createPaymentPreparationAuthorityGateway(http:HttpClient) {
  return {
    read:async(agreementId:string,obligationId:string)=>{
      if(!uuid.test(agreementId)||!uuid.test(obligationId))throw Error('Invalid Agreement or obligation');
      const raw=await http.request<unknown>(
        `/api/v1/me/payments/preparation-authority?agreementId=${encodeURIComponent(agreementId)}&obligationId=${encodeURIComponent(obligationId)}`,
        {auth:'required'});
      const verified=verifyPreparationAuthority(raw,agreementId,obligationId);
      if(!verified)throw Error('Payment preparation authority could not be verified');
      return verified;
    }
  };
}
