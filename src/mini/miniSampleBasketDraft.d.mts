import type {MiniStorePlanLine,MiniBasketFulfilment} from './MiniBuyStore';
export declare const MINI_SAMPLE_BASKET_KEY:string;
export type MiniSampleBasketDraft={
 lines:MiniStorePlanLine[];fulfilmentChoice:MiniBasketFulfilment|null;
 answers:Record<string,string>;deliveryArea:string;deliveryQuoteSelected:boolean;
 quoteAccepted:Record<string,number>;savedAt:string;
};
export declare function readSampleBasketDraft(storage?:Pick<Storage,'getItem'>|null):MiniSampleBasketDraft|null;
export declare function saveSampleBasketDraft(storage:Pick<Storage,'setItem'>|null|undefined,
 packet:Omit<MiniSampleBasketDraft,'savedAt'>):boolean;
export declare function clearSampleBasketDraft(storage:Pick<Storage,'removeItem'>|null|undefined):void;
