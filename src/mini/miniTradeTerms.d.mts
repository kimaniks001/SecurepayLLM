import type {MiniStorePlanLine} from './MiniBuyStore';
import type {MiniProviderRequest,MiniSampleProviderReply} from './miniBasketQuietFairTrade.mjs';
import type {MiniDeliveryContract} from './miniDeliveryContract.mjs';
export type MiniSampleTerm={
 sellerKsNumber:string;offerId:string;offerUpdatedAt:string;
 label:string;value:string;origin:'BUYER_PROPOSED'|'PROVIDER_SAMPLE_REVIEWED';
};
export declare function miniSampleAgreementTerms(lines:MiniStorePlanLine[],
 buyerAnswers?:Array<{sellerKsNumber:string;offerId:string;offerUpdatedAt:string;question:string;proposedAnswer:string}>,
 providerRequests?:MiniProviderRequest[],replies?:Record<string,MiniSampleProviderReply>):MiniSampleTerm[];
export declare function miniSellerScopedProposal(lines:MiniStorePlanLine[],terms?:MiniSampleTerm[],
 deliveryContracts?:MiniDeliveryContract[]):{
 kind:'BUYER_PROPOSED';moneyReady:false;
 sellers:Array<{sellerKsNumber:string;offers:Array<{offerId:string;offerUpdatedAt:string;title:string;
 quantity:number;priceMinor:number|null;currency:string}>;terms:MiniSampleTerm[]}>;
 deliveryAgreements:Array<{providerKsNumber:string;sourceOfferIds:string[];
 destination:string;window:string;feeMinor:number;requiresCarrierAcceptance:true}>;
};
