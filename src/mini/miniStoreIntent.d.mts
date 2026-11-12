import type {MiniStorePlanLine} from './MiniBuyStore';
export interface MiniStoreIntentLine {
 key:string;offerId:string;sellerKsNumber:string;sellerName:string;
 title:string;quantity:number;priceMinor:number|null;currency:string;
}
export interface MiniStoreIntent {
 kind:'single'|'multi';lines:MiniStoreIntentLine[];statement:string;
 source:{sourceId:string;sourceOwnerKsNumber:string;sourceDescription:string}|null;
 distinctSellers:number;
}
export declare function miniStoreIntent(lines:MiniStorePlanLine[]):MiniStoreIntent|null;
