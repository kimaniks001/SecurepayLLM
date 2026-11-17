import type {MiniStorePlanLine,MiniBasketFulfilment} from './MiniBuyStore';
export interface MiniBasketReview {
  itemCount:number;
  sellerCount:number;
  goods:boolean;
  missing:string[];
  readyToReview:boolean;
  sellerConfirmationRequired:true;
  readyToPay:false;
  totalMinor:number|null;
  currency:string|null;
  amountNeedsQuote:boolean;
  fulfilmentChoice:MiniBasketFulfilment|null;
}
export declare function miniBasketReadiness(
  lines:readonly MiniStorePlanLine[],
  options?:{sourcesFresh?:boolean;fulfilmentChoice?:MiniBasketFulfilment|null}
):MiniBasketReview;
