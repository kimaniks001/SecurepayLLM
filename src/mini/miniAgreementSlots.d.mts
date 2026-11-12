import type { AgreementFormationDto } from '../api/securepay/agent/dto';
export interface MiniAgreementItem {
  key:string; title:string; value:string; detail:string|null;
  needsChecking:boolean; basis:string|null; kind:'term'|'person';
}
export interface MiniAgreementSection { id:string; title:string; items:MiniAgreementItem[]; }
export interface MiniAgreementSlotView {
  conversationId:string; version:number; stage:string; summary:string|null;
  sections:MiniAgreementSection[];
  unresolved:{id:string;text:string;acknowledged:boolean;blocks:string|null}[];
  question:{text:string;choices:string[];blocksSetUp:boolean}|null;
  sourceReading:string[]; reviewable:boolean; confirmable:boolean;
  reviewBlockedReason:string|null;confirmationBlockedReason:string|null;
  accepted:false;paid:false;moneyMoved:false;
}
export declare function miniAgreementSlots(dto:AgreementFormationDto):MiniAgreementSlotView|null;
