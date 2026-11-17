import type {MiniStorePlanLine,MiniBasketFulfilment} from './MiniBuyStore';
export type MiniDeliveryContract={
 id:string;kind:'DELIVERY';providerKsNumber:string;providerName:string;
 pickupStores:string[];goods:Array<{sellerKsNumber:string;offerId:string;title:string;quantity:number}>;
 destination:string;window:string;windowKey:'next'|'arrange';
 feeMinor:number;currency:'KES';customerApprovalRequired:true;customerApproved:boolean;
 providerAcceptanceRequired:true;providerAccepted:boolean;parentPurchaseId:string|null;
};
export declare const SAMPLE_DELIVERY_WINDOWS:Record<'next'|'arrange',string>;
export declare function miniDeliveryContracts(input:{
 choice:MiniBasketFulfilment|null;lines:MiniStorePlanLine[];destination:string;
 window:'next'|'arrange'|null;deliveryQuoteSelected:boolean;
}):MiniDeliveryContract[];
export declare function miniDeliveryContractSummary(contracts:MiniDeliveryContract[]):{
 count:number;feeMinor:number;ready:boolean;
};
