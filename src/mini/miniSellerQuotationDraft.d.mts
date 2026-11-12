export interface MiniSellerQuotationDraft {
  quantity:number;unitPriceMinor:number;totalMinor:number;buyerKsNumber:string;
  statement:string;source:{sourceId:string;sourceOwnerKsNumber:string;sourceDescription:string};
}
export interface MiniSellerQuotationInput {
  sellerKsNumber:string;offerId:string;title:string;offerUpdatedAt:string;
  publishedPriceMinor:number|null;currency:string;buyerKsNumber:string;
  quantity:string;unitPrice:string;deliveryPlace:string;deliveryDate:string;
  deliveryBy:'SELLER'|'BUYER'|'TO_AGREE';conditions:string;
}
export declare function miniSellerQuotationDraft(input:MiniSellerQuotationInput):MiniSellerQuotationDraft|null;
