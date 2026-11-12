import type { CurrentUserAgreementSummaryResponse, AgreementDetailResponse } from '../api/securepay/agreements/dto';
import type { Page } from '../api/securepay/agreements';
export interface MiniAgreementAction {
 actionCode:string;reason:string;deadline:string|null;attentionClass:string|null;
}
export interface MiniAgreementItem {
 id:string;versionId:string;title:string;reference:string|null;
 statusCode:string;statusText:string;attentionRequired:boolean;
 role:string;participantStatus:string;actions:MiniAgreementAction[];
 nextDeadline:string|null;lastUpdated:string|null;
}
export interface MiniAgreementPage {
 items:MiniAgreementItem[];page:number;size:number;total:number;hasMore:boolean;
}
export interface MiniAgreementDetail {
 id:string;title:string;reference:string|null;statusCode:string;statusText:string;
 purpose:string|null;
 currentVersion:{id:string;number:number}|null;
 participants:{id:string;name:string;role:string;status:string}[];
 milestones:{id:string;title:string;status:string;description:string|null;dueAt:string|null}[];
 terms:{id:string;title:string;description:string|null;status:string}[];
 moneyStatus:string|null;activityCount:number;
}
export declare function miniAgreementStatus(code:string):string;
export declare function miniAgreementHomePage(response:Page<CurrentUserAgreementSummaryResponse>,expectedPage?:number):MiniAgreementPage|null;
export declare function miniAgreementDetailView(dto:AgreementDetailResponse,expectedId:string,expectedVersionId?:string|null):MiniAgreementDetail|null;
