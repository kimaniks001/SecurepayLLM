export interface MiniBasketQuestion {
 id:string;offerId:string;sellerKsNumber:string;offerTitle:string;
 type:'choice'|'text';title:string;hint:string;placeholder?:string;maxLength?:number;
 choices?:readonly (readonly [string,string])[];
}
export interface MiniBasketQuestionPlan {
 questions:MiniBasketQuestion[];nextQuestion:MiniBasketQuestion|null;
 complete:boolean;resolved:number;outstanding:number;
}
export declare function miniBasketQuestions(lines:readonly {sellerKsNumber:string;offerId:string;title:string;
  description?:string|null;kind?:'PRODUCT'|'SERVICE'}[],answers?:Record<string,string>):MiniBasketQuestionPlan;
export declare function miniBasketAnswersForOffer(lines:readonly {sellerKsNumber:string;offerId:string;title:string;
 description?:string|null;kind?:'PRODUCT'|'SERVICE'}[],answers?:Record<string,string>):Array<{
 offerId:string;sellerKsNumber:string;question:string;proposedAnswer:string
}>;
