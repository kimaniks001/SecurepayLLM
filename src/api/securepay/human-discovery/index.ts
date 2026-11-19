import type { HttpClient } from '../http';

export type HumanHelpIntent = 'CONVERSATION'|'LOCAL_KNOWLEDGE'|'FIELD_CHECK'|'SPECIALIST';
export type HelperRole = 'PLUG'|'MASTER';
export interface HumanHelperOption {
  helperIdentityId: string;
  helperRole: HelperRole;
  serviceKey: string;
  serviceLabel: string;
  rateMinor: string;
  currency: string;
  billingBasis: 'FIXED'|'HOURLY'|'PER_SESSION';
  serviceCompetenceScreened: true;
  professionalLicenseVerified: false;
  locationMatchVerified: false;
  humanContactEstablished: false;
  hired: false;
  originalAgreementAccessible: false;
  moneyAuthorized: false;
}
export interface HumanDiscovery {
  intent: HumanHelpIntent;
  helpers: HumanHelperOption[];
  geographyMatched: false;
  humanContactEstablished: false;
  agreementChanged: false;
  moneyAuthorized: false;
  limitation: string;
}
const intents: HumanHelpIntent[]=['CONVERSATION','LOCAL_KNOWLEDGE','FIELD_CHECK','SPECIALIST'];
const KEY=/^[a-z0-9][a-z0-9._-]{2,119}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);

/**
 * H4C does not send a customer story, source Agreement, evidence, precise
 * location, contact details, client-provided identity, or Money information.
 * The first-party HTTP client obtains authentication from its memory session.
 */
export function createHumanDiscoveryGateway(http:Pick<HttpClient,'request'>) {
  return {
    async discover(intent:HumanHelpIntent):Promise<HumanDiscovery> {
      if(!intents.includes(intent))throw new Error('Choose the kind of human help needed');
      const raw:unknown=await http.request<unknown>(
        '/api/v1/human-layer/helpers/discover?intent='+encodeURIComponent(intent),{
          method:'GET',auth:'required'
        });
      if(!isObject(raw)||raw.intent!==intent||!Array.isArray(raw.helpers)
        ||raw.helpers.length>8||raw.geographyMatched!==false
        ||raw.humanContactEstablished!==false
        ||raw.agreementChanged!==false||raw.moneyAuthorized!==false
        ||typeof raw.limitation!=='string'||raw.limitation.length>800)
        throw new Error('Qualified helper results could not be verified');
      if(!raw.helpers.every(item=>isObject(item)
        &&typeof item.helperIdentityId==='string'&&UUID.test(item.helperIdentityId)
        &&(item.helperRole==='PLUG'||item.helperRole==='MASTER')
        &&typeof item.serviceKey==='string'&&KEY.test(item.serviceKey)
        &&typeof item.serviceLabel==='string'&&item.serviceLabel.length>0
        &&item.serviceLabel.length<=220
        &&typeof item.rateMinor==='string'&&/^\d{1,19}$/.test(item.rateMinor)
        &&typeof item.currency==='string'&&/^[A-Z]{3}$/.test(item.currency)
        &&['FIXED','HOURLY','PER_SESSION'].includes(String(item.billingBasis))
        &&item.serviceCompetenceScreened===true
        &&item.professionalLicenseVerified===false
        &&item.locationMatchVerified===false
        &&item.humanContactEstablished===false
        &&item.hired===false
        &&item.originalAgreementAccessible===false
        &&item.moneyAuthorized===false))
        throw new Error('A helper response exceeded verified H4C permissions');
      return raw as unknown as HumanDiscovery;
    }
  };
}
export type HumanDiscoveryGateway=ReturnType<typeof createHumanDiscoveryGateway>;
