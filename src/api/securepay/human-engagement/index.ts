import type { HttpClient } from '../http';
import type { HelperRole, HumanHelperOption } from '../human-discovery';

export type HumanEngagementStatus =
  'REQUESTED'|'HELPER_ACCEPTED'|'READY_FOR_AGREEMENT'|'DECLINED'|'WITHDRAWN'|'EXPIRED';
export type HumanEngagementAction =
  'HELPER_ACCEPT'|'HELPER_DECLINE'|'REQUESTER_CONFIRM'|'REQUESTER_WITHDRAW';
export interface HumanEngagement {
  engagementId:string;
  requesterIdentityId:string;
  helperIdentityId:string;
  viewerRole:'REQUESTER'|'HELPER';
  helperRole:HelperRole;
  serviceKey:string;
  serviceLabel:string;
  scopeStatement:string;
  completionCondition:string;
  units:number;
  unitRateMinor:string;
  totalQuoteMinor:string;
  currency:string;
  billingBasis:'FIXED'|'HOURLY'|'PER_SESSION';
  status:HumanEngagementStatus;
  version:number;
  expiresAt:string;
  helperAccepted:boolean;
  requesterConfirmed:boolean;
  canonicalAgreementCreated:false;
  secureLinkIssued:false;
  workAuthorized:false;
  originalAgreementAccess:false;
  moneyAuthorized:false;
}
export interface H4dRequest {
  idempotencyKey:string;
  helperIdentityId:string;
  helperRole:HelperRole;
  serviceKey:string;
  scopeStatement:string;
  completionCondition:string;
  units:number;
  expectedUnitRateMinor:string;
  expectedCurrency:string;
  expectedBillingBasis:'FIXED'|'HOURLY'|'PER_SESSION';
  consentVersion:'H4D_TASK_BRIEF_V1';
}
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const KEY=/^[a-z0-9][a-z0-9._-]{2,119}$/;
const statuses=new Set<HumanEngagementStatus>([
  'REQUESTED','HELPER_ACCEPTED','READY_FOR_AGREEMENT','DECLINED','WITHDRAWN','EXPIRED'
]);
const isObj=(value:unknown):value is Record<string,unknown>=>
  typeof value==='object'&&value!==null&&!Array.isArray(value);
function validate(row:unknown):HumanEngagement {
  if(!isObj(row)
      ||!UUID.test(String(row.engagementId))
      ||!UUID.test(String(row.requesterIdentityId))
      ||!UUID.test(String(row.helperIdentityId))
      ||!['REQUESTER','HELPER'].includes(String(row.viewerRole))
      ||!['PLUG','MASTER'].includes(String(row.helperRole))
      ||!KEY.test(String(row.serviceKey))
      ||typeof row.serviceLabel!=='string'||row.serviceLabel.length>220
      ||typeof row.scopeStatement!=='string'||row.scopeStatement.length<12
      ||row.scopeStatement.length>1000
      ||typeof row.completionCondition!=='string'||row.completionCondition.length<8
      ||row.completionCondition.length>600
      ||!Number.isSafeInteger(row.units)||Number(row.units)<1||Number(row.units)>100
      ||typeof row.unitRateMinor!=='string'||!/^\d{1,19}$/.test(row.unitRateMinor)
      ||typeof row.totalQuoteMinor!=='string'||!/^\d{1,19}$/.test(row.totalQuoteMinor)
      ||BigInt(row.unitRateMinor)*BigInt(Number(row.units))!==BigInt(row.totalQuoteMinor)
      ||typeof row.currency!=='string'||!/^[A-Z]{3}$/.test(row.currency)
      ||!['FIXED','HOURLY','PER_SESSION'].includes(String(row.billingBasis))
      ||!statuses.has(row.status as HumanEngagementStatus)
      ||!Number.isSafeInteger(row.version)||Number(row.version)<1
      ||typeof row.expiresAt!=='string'||!Number.isFinite(Date.parse(row.expiresAt))
      ||typeof row.helperAccepted!=='boolean'||typeof row.requesterConfirmed!=='boolean'
      ||row.canonicalAgreementCreated!==false||row.secureLinkIssued!==false
      ||row.workAuthorized!==false||row.originalAgreementAccess!==false
      ||row.moneyAuthorized!==false)
    throw new Error('H4D request cannot be verified as a private nonfunded invitation');
  return row as unknown as HumanEngagement;
}
export function createHumanEngagementGateway(http:Pick<HttpClient,'request'>) {
  return {
    async create(input:H4dRequest):Promise<HumanEngagement> {
      if(!UUID.test(input.idempotencyKey)||!UUID.test(input.helperIdentityId)
         ||!KEY.test(input.serviceKey)||!['PLUG','MASTER'].includes(input.helperRole)
         ||input.scopeStatement.trim().length<12||input.scopeStatement.length>1000
         ||input.completionCondition.trim().length<8||input.completionCondition.length>600
         ||!Number.isInteger(input.units)||input.units<1||input.units>100
         ||!/^\d{1,19}$/.test(input.expectedUnitRateMinor)
         ||!/^[A-Z]{3}$/.test(input.expectedCurrency)
         ||!['FIXED','HOURLY','PER_SESSION'].includes(input.expectedBillingBasis)
         ||input.consentVersion!=='H4D_TASK_BRIEF_V1')
        throw new Error('A reviewed helper, scope and permission are required');
      const row=await http.request<unknown>('/api/v1/human-layer/engagements',{
        method:'POST',auth:'required',body:input
      });
      const value=validate(row);
      if(value.helperIdentityId!==input.helperIdentityId
          ||value.helperRole!==input.helperRole
          ||value.serviceKey!==input.serviceKey
          ||value.scopeStatement!==input.scopeStatement.trim()
          ||value.completionCondition!==input.completionCondition.trim()
          ||value.units!==input.units
          ||value.unitRateMinor!==input.expectedUnitRateMinor
          ||value.currency!==input.expectedCurrency
          ||value.billingBasis!==input.expectedBillingBasis)
        throw new Error('Returned H4D request differs from the reviewed service');
      return value;
    },
    async mine():Promise<HumanEngagement[]> {
      const rows:unknown=await http.request<unknown>('/api/v1/human-layer/engagements/mine',{
        method:'GET',auth:'required'
      });
      if(!Array.isArray(rows)||rows.length>40)
        throw new Error('H4D inbox response invalid');
      return rows.map(validate);
    },
    async get(id:string):Promise<HumanEngagement> {
      if(!UUID.test(id))throw new Error('Invalid H4D request reference');
      return validate(await http.request<unknown>(
        '/api/v1/human-layer/engagements/'+encodeURIComponent(id),{
          method:'GET',auth:'required'
        }));
    },
    async decide(id:string,action:HumanEngagementAction,expectedVersion:number):
      Promise<HumanEngagement> {
      if(!UUID.test(id)||!['HELPER_ACCEPT','HELPER_DECLINE',
            'REQUESTER_CONFIRM','REQUESTER_WITHDRAW'].includes(action)
          ||!Number.isSafeInteger(expectedVersion)||expectedVersion<1)
        throw new Error('Review the latest request before deciding');
      const row=validate(await http.request<unknown>(
        '/api/v1/human-layer/engagements/'+encodeURIComponent(id)+'/decision',{
          method:'POST',auth:'required',body:{action,expectedVersion}
        }));
      if(row.engagementId!==id||row.version!==expectedVersion+1)
        throw new Error('H4D response did not confirm the exact request revision');
      return row;
    }
  };
}
export type HumanEngagementGateway=ReturnType<typeof createHumanEngagementGateway>;
export type H4dSelectedHelper=Pick<HumanHelperOption,'helperIdentityId'|'helperRole'|
  'serviceKey'|'serviceLabel'|'rateMinor'|'currency'|'billingBasis'>;
