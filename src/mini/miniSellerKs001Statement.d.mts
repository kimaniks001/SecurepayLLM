export type MiniSellerKs001Message =
  | {ok:true;statement:string;unverified:true;agreementCreated:false;secureLinkIssued:false;moneyAuthorized:false}
  | {ok:false;reason:string;actualLength?:number;maxChars?:number};
export function miniSellerKs001Statement(input:{
  prepared:{ok:boolean;offerTerms?:Record<string,unknown>};
  maxChars?:number;
}):MiniSellerKs001Message;
