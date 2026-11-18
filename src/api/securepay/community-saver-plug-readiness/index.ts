import {segment,type HttpClient} from '../http';

/**
 * Self-scoped Plug readiness ONLY. No opportunity ID, trade source, customer
 * identity, payout instruction, or public Plug profile can be requested here.
 */
export type CommunitySaverActivity =
  'MY_RIDE_CARGO_COMPATIBILITY'|
  'SHORTSTAYS_BOOKING_FIT'|
  'STORAGE_SPACE_COMPATIBILITY';
export const communitySaverActivities:ReadonlyArray<{code:CommunitySaverActivity;label:string;platform:string}>=[
  {code:'MY_RIDE_CARGO_COMPATIBILITY',label:'Safe cargo sharing',platform:'My Ride'},
  {code:'SHORTSTAYS_BOOKING_FIT',label:'Guest and stay compatibility',platform:'Shortstays'},
  {code:'STORAGE_SPACE_COMPATIBILITY',label:'Suitable storage space',platform:'Storage'}
];
export interface CommunitySaverPlugReadiness {
  platformCode:string;
  activityCode:CommunitySaverActivity;
  marketActive:boolean;
  basicQualified:boolean;
  capabilityQualified:boolean;
  available:boolean;
  specialistAssessed:boolean;
  licenceCheckStatus:string;
  specialistValidUntil:string|null;
  reasonCode:string;
  mayEnterPrivateScreening:boolean;
  canReceiveLiveAssignment:false;
  canSeeOtherTraders:false;
  moneyAuthorized:false;
}
export function createCommunitySaverPlugReadinessGateway(http:HttpClient) {
  return {
    mine:(activity:CommunitySaverActivity)=>http.request<CommunitySaverPlugReadiness>(
      '/api/v1/mini/me/community-saver/plug-readiness?activityCode='+segment(activity),
      {auth:'required'})
  };
}
export type CommunitySaverPlugReadinessGateway=ReturnType<typeof createCommunitySaverPlugReadinessGateway>;
