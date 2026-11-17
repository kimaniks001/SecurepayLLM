import type {MiniStorePlanLine} from './MiniBuyStore';
export interface MiniStoreIntentLine {
 key:string;offerId:string;sellerKsNumber:string;sellerName:string;
 title:string;quantity:number;priceMinor:number|null;currency:string;offerUpdatedAt?:string;
}
export interface MiniStoreIntent {
 kind:'single'|'multi';lines:MiniStoreIntentLine[];statement:string;
 source:{sourceId:string;sourceOwnerKsNumber:string;sourceDescription:string}|null;
 distinctSellers:number;
}
export declare function miniStoreIntent(lines:MiniStorePlanLine[],options?:{
 fulfilmentPreference?:'collect'|'ask_sellers'|'explore_combined'|null;
 buyerAnswers?:Array<{sellerKsNumber:string;offerId:string;offerUpdatedAt:string;question:string;proposedAnswer:string}>
}):MiniStoreIntent|null;
