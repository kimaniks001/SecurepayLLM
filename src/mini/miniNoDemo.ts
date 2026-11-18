import type {HttpClient} from '../api/securepay/http';
import type {SessionTokensDto} from '../api/securepay/auth';
import type {ConversationAccessStore} from '../api/securepay/agent/continuity';

/**
 * CUSTOMER BUILD ONLY. This module replaces the entire local synthetic API,
 * test identities, fake Agreements, simulated Money, and tab-scoped fixtures.
 *
 * It must never grant access or silently replace a genuine first-party API.
 * Engineering tests import miniInteractiveDemo.ts directly, without this alias.
 */
function fixturesUnavailable():never{
  throw new Error('Local example accounts are not available in SecurePay Mini');
}
export function miniDemoTokens(_actor:'amina'|'njeri'):SessionTokensDto{
  return fixturesUnavailable();
}
export function miniDemoSeedAccess(_store:ConversationAccessStore):void{
  fixturesUnavailable();
}
export function createMiniDemoHttpClient(_getToken:()=>string|null):HttpClient{
  return fixturesUnavailable();
}
export function miniDemoMoneyFixtureState(){
  return {sourceMatches:false,sellerJoined:false,sellerConfirmed:false};
}
export function isMiniExperiencePreviewHost(_host:string):boolean{
  // Production Mini must never permit demo accounts or developer Money commands.
  return false;
}
export const miniDemoSampleLabels={amina:'',njeri:''} as const;
export function miniDemoReset():void{
  fixturesUnavailable();
}
