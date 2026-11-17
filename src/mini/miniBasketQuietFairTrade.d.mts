import type {MiniStorePlanLine,MiniBasketFulfilment} from './MiniBuyStore';
export type MiniBasketOfferSource={sellerKsNumber:string;offerId:string;offerUpdatedAt:string;
  offerTitle:string;quantity:number};
export type MiniProviderRequest={id:string;source:MiniBasketOfferSource;supplierLabel:string;title:string;
 topics:Array<{code:'COVERAGE'|'SERVICE_START';question:string}>;owner:'PROVIDER';
 state:'AWAITING_PROVIDER_CLARIFICATION';blockingAcceptance:true};
export type MiniSampleProviderReply={requestId:string;source:MiniBasketOfferSource;
 supplierLabel:string;terms:Array<{code:'COVERAGE'|'SERVICE_START';value:string}>;
 kind:'FICTIONAL_PROVIDER_REPLY';buyerApproved:boolean};
export declare const CANONICAL_FAIR_TRADE_OWNER:string;
export declare const CANONICAL_EXAMINATION_STATE:'NOT_ASSESSED';
export declare const FAIR_TRADE_LENS_COUNT:12;
export declare function miniBasketProviderRequests(lines:readonly MiniStorePlanLine[]):MiniProviderRequest[];
export declare function miniSampleProviderReply(request:MiniProviderRequest):MiniSampleProviderReply|null;
export declare function miniProviderReplyMatchesSource(request:MiniProviderRequest,
 reply:MiniSampleProviderReply|null|undefined):boolean;
export declare function miniBasketQuietPreflight(lines:readonly MiniStorePlanLine[],
 options?:{answers?:Record<string,string>;fulfilmentChoice?:MiniBasketFulfilment|null;
  deliveryArea?:string;sourceFresh?:boolean;
  providerReplies?:Record<string,MiniSampleProviderReply>}):{
 sourceReferences:Array<MiniBasketOfferSource|null>;provenanceComplete:boolean;
 buyerAnswersProposed:number;providerRequests:MiniProviderRequest[];
 pendingProviderRequests:MiniProviderRequest[];
 canonicalExamination:{authority:string;status:'NOT_ASSESSED';lensCount:12;
  evaluated:false;fullyExamined:false;moneyReady:false};
 wwwwWh:Record<'who'|'what'|'where'|'when'|'why'|'how',{source:string;detail:string}>;
 buyerCanReviewDraft:boolean;supplierClarificationBeforeAcceptance:boolean;
 sourceFresh:boolean;moneyReady:false;
};
