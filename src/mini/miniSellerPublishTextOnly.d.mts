import type { StoreGateway } from '../api/securepay/store';
import type { MiniSellerCanonicalPrepared, MiniSellerStoreContext } from './miniSellerCanonicalStoreBridge.mjs';
export interface MiniSellerSavedStoreDraft {
  ok:true;
  offerId:string;
  offerUpdatedAt:string|null;
  published:false;
}
export type MiniSellerPublishedTextResult =
  | {ok:true;offerId:string;published:true;availabilityState:'NEEDS_CONFIRMATION';
     mediaRefs:[];agreementCreated:false;secureLinkIssued:false;
     moneyAuthorized:false;updatedAt:string}
  | {ok:false;reason:string};
export function miniSellerPublishTextOnly(input:{
  prepared:MiniSellerCanonicalPrepared;
  draft:MiniSellerSavedStoreDraft;
  gateway:StoreGateway;
  context:MiniSellerStoreContext;
  confirmed:boolean;
  localOfferUnchanged:boolean;
}):Promise<MiniSellerPublishedTextResult>;
