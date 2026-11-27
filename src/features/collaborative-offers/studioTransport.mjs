import {g5Route} from './g5Transport.mjs';
const uid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const ks=v=>typeof v==='string'&&/^KS[0-9]{3,12}$/.test(v);
const txt=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const exact=(b,keys)=>b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).length===keys.length&&keys.every(k=>Object.hasOwn(b,k));
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const states=['INVITED','PREPARATION_ACCEPTED','DECLINED','WITHDRAWN','REVOKED','SUPERSEDED','EXPIRED'];
export const terminal=s=>states.includes(s)&&!['INVITED','PREPARATION_ACCEPTED'].includes(s);
export function studioRoute(method,path,body,enableG5=false){
 if(enableG5&&g5Route(method,path,body))return true;
 if(typeof path!=='string')return false;
 const m=/^\/api\/v1\/g4\/(me|business\/(KS[0-9]{3,12}))\/studio\/(.*)$/.exec(path);if(!m)return false;
 const tail=m[3],p=tail.split('/'),record=p.length===3&&uid(p[1]);
 if(method==='GET')return body===undefined&&(tail==='drafts'||tail==='inbox'||p.length===3&&['drafts','inbox'].includes(p[0])&&p[1]==='after'&&uid(p[2])||p.length===2&&p[0]==='commands'&&uid(p[1])||record&&p[0]==='drafts'&&['invitations','revisions'].includes(p[2]));
 if(method!=='POST')return false;
 if(tail==='drafts')return !!exact(body,['id','organizerKsNumber','title','purpose'])&&uid(body.id)&&ks(body.organizerKsNumber)&&(!m[2]||body.organizerKsNumber===m[2])&&txt(body.title,160)&&txt(body.purpose,800);
 if(record&&p[0]==='drafts'&&p[2]==='revision')return !!exact(body,['id','expectedRevision','title','purpose'])&&uid(body.id)&&integer(body.expectedRevision,1,49)&&txt(body.title,160)&&txt(body.purpose,800);
 if(record&&p[0]==='drafts'&&p[2]==='invitations')return !!exact(body,['id','recipientKsNumber','scope','contactPermissionAttested','expectedDraftRevision','replacesId'])&&uid(body.id)&&ks(body.recipientKsNumber)&&txt(body.scope,400)&&body.contactPermissionAttested===true&&integer(body.expectedDraftRevision,1,50)&&(body.replacesId===null||uid(body.replacesId));
 if(record&&p[0]==='inbox'&&p[2]==='contributions')return !!exact(body,['id','expectedRevision','terms'])&&uid(body.id)&&integer(body.expectedRevision,0,49)&&txt(body.terms,1600);
 if(record&&(p[0]==='inbox'&&p[2]==='decision'||p[0]==='invitations'&&p[2]==='revoke'))return !!exact(body,['id','expectedSequence','decision'])&&uid(body.id)&&integer(body.expectedSequence,0,1)&&(p[0]==='inbox'?['ACCEPT_PREPARATION','DECLINE','WITHDRAW'].includes(body.decision):body.decision==='REVOKE');
 return false;
}
const safe=v=>v&&v.agreementAuthorized===false&&v.paymentAuthorized===false;
export function isDraft(v){return !!safe(v)&&uid(v.id)&&ks(v.organizerKsNumber)&&txt(v.title,160)&&txt(v.purpose,800)&&integer(v.revision,1,50)&&typeof v.createdAt==='string'&&Number.isFinite(Date.parse(v.createdAt));}
export function isInvitation(v){return !!safe(v)&&uid(v.id)&&uid(v.draftId)&&txt(v.scope,400)&&integer(v.draftRevision,1,50)&&integer(v.decisionSequence,0,2)&&states.includes(v.status)&&(v.replacesId===null||uid(v.replacesId))&&(v.status!=='INVITED'||v.decisionSequence===0)&&(v.status!=='PREPARATION_ACCEPTED'||v.decisionSequence===1)&&typeof v.expiresAt==='string'&&Number.isFinite(Date.parse(v.expiresAt));}
const contributions=(rows,id)=>Array.isArray(rows)&&rows.length<=50&&new Set(rows.map(x=>x?.id)).size===rows.length&&rows.every((v,i)=>safe(v)&&uid(v.id)&&v.inviteId===id&&v.revision===i+1&&txt(v.terms,1600)&&typeof v.submittedAt==='string'&&Number.isFinite(Date.parse(v.submittedAt)));
export function isReceived(v){return !!v&&isDraft(v.draft)&&isInvitation(v.invitation)&&v.invitation.draftId===v.draft.id&&v.invitation.draftRevision===v.draft.revision&&contributions(v.contributions,v.invitation.id);}
export function isNomination(v){return !!v&&isInvitation(v.invitation)&&ks(v.recipientKsNumber)&&contributions(v.contributions,v.invitation.id);}

export function matchesCommandReceipt(v,pending){
 if(!safe(v)||!pending||v.id!==pending.id||!uid(v.id)||!uid(v.draftId)||!integer(v.revision,1,50))return false;
 let f;try{f=JSON.parse(pending.fingerprint)}catch{return false;}
 if(!Array.isArray(f))return false;
 switch(f[0]){
  case 'create':return v.kind==='CREATE'&&v.draftId===v.id&&v.invitationId===null&&v.revision===1&&v.decision===null;
  case 'revision':return v.kind==='REVISION'&&v.draftId===f[1]&&v.invitationId===null&&v.revision===f[2]+1&&v.decision===null;
  case 'invite':return v.kind==='INVITE'&&v.draftId===f[1]&&v.invitationId===v.id&&v.revision===f[2]&&v.decision===null;
  case 'contribute':return v.kind==='CONTRIBUTE'&&v.invitationId===f[1]&&v.revision===f[2]+1&&v.decision===null;
  case 'decision':return v.kind==='DECISION'&&v.invitationId===f[1]&&v.revision===f[2]+1&&v.decision===f[3];
  default:return false;
 }
}

export function isCommandReceipt(v,id){return !!safe(v)&&uid(id)&&v.id===id&&uid(v.draftId)&&integer(v.revision,1,50)&&(['CREATE','REVISION'].includes(v.kind)?v.invitationId===null&&v.decision===null&&(v.kind==='CREATE'?v.draftId===id&&v.revision===1:v.revision>=2):uid(v.invitationId)&&(v.kind==='INVITE'?v.invitationId===id&&v.decision===null:v.kind==='CONTRIBUTE'?v.decision===null:v.kind==='DECISION'&&v.revision<=2&&['ACCEPT_PREPARATION','DECLINE','WITHDRAW','REVOKE'].includes(v.decision)));}
export function validPage(rows,cursor,key,validate){return Array.isArray(rows)&&rows.length<=50&&rows.every(validate)&&new Set(rows.map(key)).size===rows.length&&(!cursor||!rows.some(x=>key(x)===cursor));}
