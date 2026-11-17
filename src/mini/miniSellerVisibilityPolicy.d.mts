import type {StoreOfferResponse,PrivateStoreOfferResponse} from '../api/securepay/store/dto';
export function miniSellerVisibilityFresh(
  reviewed:StoreOfferResponse|null|undefined,
  latest:StoreOfferResponse|null|undefined
): {ok:true;offerId:string;expectedUpdatedAt:string}|{ok:false;reason:string};
export function miniSellerVisibilityReceipt(
  receipt:PrivateStoreOfferResponse|null|undefined,
  expectedId:string
): {ok:true;updatedAt:string}|{ok:false;reason:string};
