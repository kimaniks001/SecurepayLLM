import type { StoreGateway } from '../api/securepay/store';
export interface MiniSellerCanonicalPrepared {
  ok: boolean;
  storeCandidate?: {
    kind: 'PRODUCT'|'SERVICE'|'CAPACITY';
    title: string;
    description?: string|null;
    priceMinor?: number|null;
    quantityAvailable?: number|null;
    availabilityState?: string;
    published?: boolean;
    mediaRefs?: string[];
  };
  boundary?: { canonical?: boolean; storePublished?: boolean };
}
export type MiniSellerStoreContext = {type:'personal'}|{type:'business';businessKsNumber:string};
export type MiniSellerStoreResult =
  | {ok:true;offerId:string;offerUpdatedAt:string|null;published:false;shared:false;secureLinkIssued:false;agreementCreated:false;moneyAuthorized:false}
  | {ok:false;reason:string};
export function miniSellerCreateCanonicalStoreDraft(input:{
  prepared:MiniSellerCanonicalPrepared;
  gateway:StoreGateway;
  context:MiniSellerStoreContext;
  confirmed:boolean;
}):Promise<MiniSellerStoreResult>;
