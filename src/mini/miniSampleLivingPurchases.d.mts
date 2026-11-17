export type MiniSampleRail='CHOICE_KS_ACCOUNT'|'MPESA_STK'|'PESALINK';
export type MiniSampleItem={sellerKsNumber:string;sellerName:string;title:string;quantity:number;amountMinor:number};
export type MiniSampleProgress={title:string;status:'done'|'current'|'upcoming'};
export type MiniSamplePurchase={id:string;title:string;amountMinor:number;rail:MiniSampleRail;
 agreementKind?:'PURCHASE'|'DELIVERY';parentId?:string;linkedDeliveryIds?:string[];
 linkedDeliveryAgreements?:MiniSamplePurchase[];
 deliveryTerms?:{destination:string;window:string;pickupStores:string[]};
 createdAt:string;fundedAt:string;delivery:string;items:MiniSampleItem[];progress:MiniSampleProgress[]};
export type MiniSampleLine={sellerKsNumber:string;sellerName:string;title:string;quantity:number;priceMinor:number|null};
export declare const SAMPLE_PURCHASE_KEY:string;
export declare const SAMPLE_RAILS:MiniSampleRail[];
export declare function sampleAgreementTitle(lines:MiniSampleLine[]):string;
export declare function validSamplePurchase(record:unknown):record is MiniSamplePurchase;
export declare function makeSampleLivingPurchase(input:{
 lines:MiniSampleLine[];rail:MiniSampleRail;delivery:string;
 deliveryFeeMinor?:number;deliveryProvider?:string|null;deliveryContracts?:Array<{
 providerAccepted:boolean;customerApprovalRequired:boolean;providerKsNumber:string;providerName:string;
 destination:string;window:string;pickupStores:string[];feeMinor:number;
 goods:Array<{quantity:number;title:string}>;
 }>;now?:Date;
}):MiniSamplePurchase|null;
export declare function readMiniSamplePurchases(storage?:Pick<Storage,'getItem'>|null):MiniSamplePurchase[];
export declare function recordMiniSamplePurchase(storage:Pick<Storage,'getItem'|'setItem'>|null|undefined,
 record:MiniSamplePurchase):MiniSamplePurchase[];
