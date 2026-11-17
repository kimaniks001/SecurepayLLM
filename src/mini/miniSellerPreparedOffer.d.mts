import type {UpsertStoreOfferRequest, OfferKind} from '../api/securepay/store/dto';

export type SellerOfferSummary = {
  title:string; kind:OfferKind; category:string;
  moneyText:string; count:number|null; priceUnit:string; totalMinor:number|null;
  descriptionApproved:boolean;placeLabel:string;timing:string;
  persons:number;photos:number;documents:number;
};
export type SellerOfferSafeDraft = {
  version:2;localOnly:true;descriptionReviewed:boolean;
  title:string;category:string;priceType:string;price:string;quantity:string;unit:string;
  condition:string;specifications:string;purpose:string;included:string;
  limitations:string;warranty:string;description:string;
  placeType:string;place:string;timing:string;stockStatement:string;
};
export type SellerOfferPreparation =
  | {ok:false;error:string}
  | {ok:true;offerTerms:Record<string,unknown>;storeCandidate:UpsertStoreOfferRequest;
      summary:SellerOfferSummary;boundary:Record<string,boolean>};
export function miniSellerPreparedOffer(input:Record<string,unknown>):SellerOfferPreparation;
export function miniSellerSafeDraft(input:Record<string,unknown>):SellerOfferSafeDraft;
export function miniSellerRestoreDraft(raw:unknown):SellerOfferSafeDraft|null;
