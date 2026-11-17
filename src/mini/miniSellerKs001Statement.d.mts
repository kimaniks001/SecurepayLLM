import type {MiniSellerCanonicalPrepared} from './miniSellerCanonicalStoreBridge.mjs';
export type MiniSellerKs001Message =
  | {ok:true;statement:string;unverified:true;agreementCreated:false;secureLinkIssued:false;moneyAuthorized:false}
  | {ok:false;reason:string;actualLength?:number;maxChars?:number};
export function miniSellerKs001Statement(input:{
  prepared:MiniSellerCanonicalPrepared;
  maxChars?:number;
}):MiniSellerKs001Message;
