export type SavedDraft={id:string;organizerKsNumber:string;title:string;purpose:string;createdAt:string;revision:number;agreementAuthorized:false;paymentAuthorized:false};
export type Invitation={id:string;draftId:string;scope:string;expiresAt:string;draftRevision:number;decisionSequence:number;status:'INVITED'|'PREPARATION_ACCEPTED'|'DECLINED'|'WITHDRAWN'|'REVOKED'|'SUPERSEDED'|'EXPIRED';replacesId:string|null;agreementAuthorized:false;paymentAuthorized:false};
export type Contribution={id:string;inviteId:string;revision:number;terms:string;submittedAt:string;agreementAuthorized:false;paymentAuthorized:false};
export type Received={draft:SavedDraft;invitation:Invitation;contributions:Contribution[]};
export type Nomination={invitation:Invitation;recipientKsNumber:string;contributions:Contribution[]};
export function studioRoute(method:string,path:string,body?:unknown,enableG5?:boolean):boolean;
export function isDraft(v:unknown):v is SavedDraft;
export function isInvitation(v:unknown):v is Invitation;
export function isReceived(v:unknown):v is Received;
export function isNomination(v:unknown):v is Nomination;

export function terminal(s:string):boolean;

export function matchesCommandReceipt(value:unknown,pending:{fingerprint:string;id:string}|null):boolean;

export function isCommandReceipt(v:unknown,id:string):v is {id:string;kind:string;draftId:string;invitationId:string|null;revision:number;decision:string|null};
export function validPage<T>(rows:unknown,cursor:string|null,key:(v:T)=>string,validate:(v:unknown)=>v is T):rows is T[];
