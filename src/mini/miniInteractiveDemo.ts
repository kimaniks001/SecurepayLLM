import { ApiError, type HttpClient, type RequestOptions } from '../api/securepay/http';
import type { SessionTokensDto } from '../api/securepay/auth';
import type { ConversationAccessStore } from '../api/securepay/agent/continuity';

/**
 * PREVIEW ONLY: deterministic in-memory / tab-scoped TEST DOUBLE for the
 * EXISTING canonical AgentGateway and AgreementGateway. This is not KS001
 * intelligence, an auth provider, an Agreement record or a Money processor.
 * Every request is handled locally; no fetch, real KSNumber or real provider.
 */
const ID = {
  chairs: '00000000-0000-4000-8000-000000000041',
  njeriChat: '00000000-0000-4000-8000-000000000042',
  njeriOffer:'00000000-0000-4000-8000-000000000081',
  kamauOffer:'00000000-0000-4000-8000-000000000082',
  agreement: '00000000-0000-4000-8000-000000000071',
  version: '00000000-0000-4000-8000-000000000072',
  invitation: '00000000-0000-4000-8000-000000000073',
  saved: '00000000-0000-4000-8000-000000000074',
  aminaPerson: '00000000-0000-4000-8000-000000000075',
  njeriPerson: '00000000-0000-4000-8000-000000000076',
};
const PREVIEW_STORAGE = 'securepay.mini.synthetic-experience.v1';
const DATE = '2026-11-12T12:00:00Z';
const LATER = '2099-12-31T23:59:00Z';
const EXPIRY = '2026-12-02T19:00:00Z';

type Actor = 'amina' | 'njeri';
type DemoMessage = { id:string; sender:'HUMAN'|'KS001'; text:string; occurredAt:string };
type DemoConversation = { owner:Actor; entries:DemoMessage[]; version:number; replyByAction:Record<string,string>;
  selectedOffer?:string; };
type State = {
  counter:number;
  conversations:Record<string,DemoConversation>;
  saved:Record<Actor,boolean>;
  savedConversations:Record<Actor,string>;
  invitationStatus:'ISSUED'|'VIEWED'|'JOINED'|'REVOKED';
  joined:boolean;confirmed:boolean;
};
const starterMessages:DemoMessage[]=[
  {id:'sample-chat-1',sender:'HUMAN',text:'I need 40 chairs for a meeting at Varsityville in Ruiru.',occurredAt:DATE},
  {id:'sample-chat-2',sender:'KS001',
    text:'Sample reply: We need 40 chairs. How many are already available?',occurredAt:DATE},
  {id:'sample-chat-3',sender:'HUMAN',text:'We have only 15. We need delivery on 2 December.',occurredAt:DATE},
  {id:'sample-chat-4',sender:'KS001',
    text:'Sample reply: 15 of 40 are available, so 25 remain to be sourced. We still need to confirm the seller, delivery and approval.',occurredAt:DATE},
];
function initialState():State{
  return {
    counter:200,
    conversations:{[ID.chairs]:{owner:'amina',entries:starterMessages.map(entry=>({...entry})),version:3,replyByAction:{}}},
    saved:{amina:true,njeri:false},
    savedConversations:{amina:ID.chairs,njeri:ID.njeriChat},
    invitationStatus:'ISSUED',joined:false,confirmed:false,
  };
}
function load():State{
  try{
    const parsed=JSON.parse(sessionStorage.getItem(PREVIEW_STORAGE)||'null');
    if(parsed && Number.isInteger(parsed.counter) && parsed.conversations?.[ID.chairs] &&
      Array.isArray(parsed.conversations[ID.chairs].entries) &&
      parsed.saved && parsed.savedConversations && typeof parsed.saved.amina==='boolean' &&
      ['ISSUED','VIEWED','JOINED','REVOKED'].includes(parsed.invitationStatus) &&
      typeof parsed.joined==='boolean' && typeof parsed.confirmed==='boolean')
      return parsed as State;
  }catch{/* demo is also usable in a private tab */}
  return initialState();
}
let state:State|undefined;
const current=()=>state??(state=load());
const persist=()=>{
  try{sessionStorage.setItem(PREVIEW_STORAGE,JSON.stringify(current()));}
  catch{/* optional, synthetic data only */}
};
function newId(){
  const serial=String(++current().counter).padStart(12,'0');
  return '00000000-0000-4000-8000-'+serial;
}
function actorFrom(getToken:()=>string|null):Actor|null{
  const token=getToken();
  return token==='mini-demo-amina'?'amina':token==='mini-demo-njeri'?'njeri':null;
}
function reject(status:number,message:string):never{
  throw new ApiError('http',message,status);
}
function requiresActor(getToken:()=>string|null,options:RequestOptions):Actor{
  const actor=actorFrom(getToken);
  if(!actor || options.auth!=='required')reject(401,'Synthetic preview requires a selected sample account');
  return actor;
}
function term(key:string,label:string,value:string,needsChecking=false){
  return {key,label,value,detail:null,needsChecking,basis:'DEMO_SYNTHETIC'};
}
function explain(text:string):string{
  const x=text.toLowerCase();
  if(/discuss a buying plan/.test(x))
    return 'Sample reply: This is your proposed Store buying plan, not an order. Which delivery location and date should the separate sellers review? Their quantities and prices still need confirmation.';
  if(/deliver|transport|date|december|where|ruiru/.test(x))
    return 'Sample reply: Delivery to Varsityville, Ruiru is proposed for 2 December. The supplier and transport still need confirmation. No driver has been booked.';
  if(/15|25|stock|availab|quantity|chairs|40/.test(x))
    return 'Sample reply: The requirement is 40 chairs. Only 15 have been stated as available; 25 still need sourcing. I cannot verify live Store stock in this demonstration.';
  if(/agreement|approve|confirm|accept|consent/.test(x))
    return 'Sample reply: This is a draft. The buyer and seller must review the exact Agreement separately. An invitation is not acceptance, and no Money has moved.';
  return 'Sample reply: This is scripted preview data, not live KS001 intelligence. Try asking about the 40 chairs, delivery, or approvals, then explore the Agreement review and My SecurePay.';
}
// Fictitious sample stores only. No relationship to real Kenyan businesses.
const sampleStores=[
  {canonicalKsNumber:'KS002',displayName:'Njeri Events · Sample Store',
    identityType:'BUSINESS',status:'ACTIVE',
    profile:{tagline:'Sample chairs for meetings',about:'Fictional shop — not live stock',
      locationLabel:'Ruiru, Kenya (sample)',heroHeadline:null,
      storefrontPreset:'MERCHANT',storefrontTheme:'FOREST',updatedAt:DATE},
    offers:[{id:ID.njeriOffer,kind:'PRODUCT',title:'Stacking event chair',
      description:'Fictional lightweight event chairs',priceMinor:16000,
      currency:'KES',quantityAvailable:25,availabilityState:'AVAILABLE',
      availabilityConfirmedAt:DATE,mediaRefs:[],updatedAt:DATE}]},
  {canonicalKsNumber:'KS003',displayName:'Kamau Furnishings · Sample Store',
    identityType:'BUSINESS',status:'ACTIVE',
    profile:{tagline:'Sample furniture',about:'Fictional shop — not live stock',
      locationLabel:'Kamakis, Kenya (sample)',heroHeadline:null,
      storefrontPreset:'MERCHANT',storefrontTheme:'FOREST',updatedAt:DATE},
    offers:[{id:ID.kamauOffer,kind:'PRODUCT',title:'Folding meeting chair',
      description:'Fictional folding chairs',priceMinor:18500,
      currency:'KES',quantityAvailable:12,availabilityState:'NEEDS_CONFIRMATION',
      availabilityConfirmedAt:null,mediaRefs:[],updatedAt:DATE}]},
];
function demoStore(ks:string){
  const found=sampleStores.find(store=>store.canonicalKsNumber===ks);
  if(!found)reject(404,'Sample Store was not found');
  return found;
}

function conversation(id:string,actor:Actor){
  const c=current().conversations[id];
  if(!c||c.owner!==actor)reject(403,'The sample conversation belongs to another account');
  return c;
}
function summary(actor:Actor){
  const s=current();
  const attention=actor==='njeri'?s.joined&&!s.confirmed:!s.confirmed;
  const actions = attention ? [{
    actionCode:actor==='amina'?'CHECK_SUPPLIER_REPLY':'CONFIRM_CURRENT_VERSION',
    category:'PEOPLE',
    reason:actor==='amina'
      ?'Njeri has not confirmed the chair Agreement yet. Check her response.'
      :'Review the current chair Agreement and decide whether to confirm your part.',
    deadline:EXPIRY,attentionClass:'NEEDS_ATTENTION',
  }] : [];
  return {
    agreementId:ID.agreement,publicReference:'DEMO-AGR-041',
    title:'40 chairs for Varsityville',purpose:'Arrange chairs and delivery to Ruiru',
    status:s.confirmed?'ACTIVE':s.joined?'PARTICIPANTS_JOINING':'INVITATION_PENDING',
    agreementType:'GOODS',proposedAmountMinor:'400000',currency:'KES',
    createdAt:DATE,updatedAt:DATE,
    currentActor:{roleCode:actor==='amina'?'BUYER':'SELLER',
      participantStatus:actor==='amina'?'CREATOR':s.confirmed?'CONFIRMED':'JOINED_UNCONFIRMED'},
    counterparty:{ksNumber:null,displayName:actor==='amina'?'Njeri':'Amina'},
    nextDeadline:EXPIRY,attentionRequired:attention,nextActions:actions,
    currentAgreementVersionId:ID.version,
    completion:{completed:false,status:'UNFINISHED',reasonCodes:['DELIVERY_PENDING'],
      agreementVersionId:ID.version,completedAt:null},
  };
}
function detail(actor:Actor){
  const base=summary(actor);
  return {
    overview:{agreementId:ID.agreement,publicReference:base.publicReference,
      title:base.title,purpose:base.purpose,description:'40 chairs; 15 stated available; delivery under discussion.',
      agreementType:'GOODS',status:base.status,currency:'KES',
      proposedAmountMinor:'400000',createdAt:DATE,updatedAt:DATE,expiresAt:null},
    currentVersion:{versionId:ID.version,versionNumber:2,contentHash:'demo-hash-2',
      createdAt:DATE,amendmentReason:null,materialChange:false},
    participants:[
      {participantId:ID.aminaPerson,roleCode:'BUYER',participantStatus:'CREATOR',
        ksNumber:'DEMO-A',displayName:'Amina'},
      {participantId:ID.njeriPerson,roleCode:'SELLER',
        participantStatus:current().confirmed?'CONFIRMED':
          current().joined?'JOINED_UNCONFIRMED':'INVITED',
        ksNumber:'DEMO-N',displayName:'Njeri'},
    ],
    milestones:[{milestoneId:'00000000-0000-4000-8000-000000000077',title:'Chairs delivered',
      description:'Confirm supply of the missing 25 chairs and transport',
      sequenceOrder:1,availableFrom:null,dueAt:EXPIRY,status:'PENDING',obligationIds:[]}],
    terms:[{obligationId:'00000000-0000-4000-8000-000000000078',
      title:'Quantity and delivery',description:'40 chairs needed; 15 stated available.',
      obligationType:'GOODS',status:'PENDING',currency:'KES',amountMinor:400000,sequenceOrder:1}],
    documents:[],activity:[],versionHistory:[],
    money:{status:'NOT_FUNDED',outstandingReasons:[],moneyRecordCount:0},
  };
}
function invitationRow(){
  return {
    invitationId:ID.invitation,agreementId:ID.agreement,
    agreementPublicReference:'DEMO-AGR-041',agreementTitle:'40 chairs for Varsityville',
    agreementPurpose:'Chairs and delivery to Ruiru',
    currency:'KES',proposedAmountMinor:400000,
    roleCode:'SELLER',inviterDisplayName:'Amina',inviterCanonicalKsNumber:'DEMO-A',
    status:current().invitationStatus,issuedAt:DATE,expiresAt:LATER,
    firstViewedAt:current().invitationStatus==='ISSUED'?null:DATE,
    isCurrentVersion:true,
    needsAttention:!current().joined && current().invitationStatus!=='REVOKED',
    targetKind:'KS_NUMBER',targetHint:'DEMO-N',
  };
}
function history(id:string,actor:Actor){
  const c=conversation(id,actor);
  return {conversationId:id,entries:c.entries};
}
function formation(id:string,actor:Actor){
  const c=conversation(id,actor);
  return {
    conversationId:id,version:c.version,
    digest:'SYNTHETIC-EXAMPLE',stage:'FORMING',
    summary:'Sample: 40 chairs required for a Ruiru meeting; 15 are stated available, 25 still needed. Delivery and acceptance are outstanding.',
    reviewable:false,confirmable:false,
    what:[term('chairs','Required goods','40 chairs'),
      term('available','Currently stated available','15 chairs',true),
      term('shortfall','Still needed','25 chairs',true)],
    who:[{key:'buyer',name:'Amina',role:'Buyer',describedAs:'Meeting organiser',
      link:'LINKED',participation:'NOT_JOINED'},
      {key:'seller',name:'Njeri',role:'Seller',describedAs:'Invited supplier',
        link:'NOT_LINKED',participation:'NOT_JOINED'}],
    money:[term('price','Sample proposed price','KSh 4,000',true)],
    when:[term('delivery','Proposed delivery','2 December 2026',true)],
    responsibilities:[{party:'Supplier',duties:[term('source','Supply','Confirm the missing 25 chairs',true),
      term('deliver','Delivery','Confirm transport to Varsityville, Ruiru',true)]}],
    conditions:[],notIncluded:[],
    openPoints:[
      {id:'demo-stock',text:'Who can supply the missing 25 chairs?',
        effect:'BLOCKS_SETUP',state:'OPEN',checked:false},
      {id:'demo-delivery',text:'Who will confirm the delivery plan?',
        effect:'BLOCKS_SETUP',state:'OPEN',checked:false},
      {id:'demo-consent',text:'Each party must review and confirm their own part.',
        effect:'BLOCKS_CONFIRMATION',state:'OPEN',checked:false},
    ],
    question:{ask:true,text:'Who will supply the missing 25 chairs?',
      choices:['This supplier','Find another Store'],blocksSetUp:true,alreadyAsked:false},
    readingSources:[],
  };
}
function savedBuild(actor:Actor){
  const id=current().savedConversations[actor];
  return {
    savedBuildId:actor==='amina'?ID.saved:'00000000-0000-4000-8000-000000000079',
    conversationId:id,title:'40 chairs — unfinished conversation',
    savedAt:DATE,buildUpdatedAt:DATE,openMatterCount:3,
    sufficiencyState:'NEEDS_INFORMATION',
  };
}
function version(){
  return {id:ID.version,versionNumber:2,
    snapshot:{title:'40 chairs for Varsityville',purpose:'Chairs and delivery to Ruiru',
      currency:'KES',proposed_amount_minor:400000},
    contentHash:'demo-hash-2',parentVersionId:null,
    amendmentReason:null,materialChange:false,versionStatus:'CURRENT',createdAt:DATE};
}
function requireAgreement(actor:Actor){
  if(actor!=='amina' && !(actor==='njeri' && current().joined))
    reject(403,'This account is not a participant in this sample Agreement');
}
export function miniDemoTokens(actor:Actor):SessionTokensDto{
  return {
    accessToken:'mini-demo-'+actor,
    accessTokenExpiresAt:LATER,
    refreshToken:'mini-demo-refresh-'+actor,
    refreshTokenExpiresAt:LATER,
  };
}
export function miniDemoSeedAccess(store:ConversationAccessStore){
  store.remember({conversationId:ID.chairs,secret:'s'.repeat(48),anonymousExpiresAt:LATER});
}
export function isMiniExperiencePreviewHost(host:string):boolean{
  return /^securepay-[a-z0-9]+-james-8078\.vercel\.app$/i.test(host) ||
    host==='localhost' || host==='127.0.0.1';
}
export const miniDemoSampleLabels={amina:'Amina · Buyer',njeri:'Njeri · Seller'} as const;

/**
 * Use HttpClient/AgentGateway/AgreementGateway as normally. All actions are
 * intercepted before a network client is created; unknown paths are REFUSED.
 * The values in this module are synthetic fixtures for preview use only.
 */
export function createMiniDemoHttpClient(getToken:()=>string|null):HttpClient{
  return {
    request:async<T>(path:string,options:RequestOptions={})=>{
      const actor=actorFrom(getToken);
      const url=new URL(path,'https://synthetic.local');
      const p=url.pathname;
      const method=options.method||'GET';
      const body=(options.body||{}) as Record<string,unknown>;
      const answer=(value:unknown):T=>value as T;
      const auth=()=>requiresActor(getToken,{...options,auth:'required'});
      const match=(regex:RegExp)=>regex.exec(p);

      // Conversation creation and reads do not require payment, external APIs
      // or authentication. The sample actor is nevertheless tracked so one
      // demo participant cannot read the other participant's dialogue.
      if(p==='/api/agent/conversations' && method==='POST'){
        if(!actor)reject(401,'Select a sample participant first');
        const id=newId();
        current().conversations[id]={owner:actor,entries:[],version:1,replyByAction:{}};
        persist();
        return answer({conversationId:id,createdAt:DATE,contextVersion:1,
          conversationAccessSecret:'s'.repeat(48),anonymousExpiresAt:LATER});
      }
      let m=match(/^\/api\/agent\/conversations\/([^/]+)\/(history|context|agreement-formation|turns|saved-build)$/);
      if(m){
        if(!actor)reject(401,'Select a sample participant first');
        const id=m[1],endpoint=m[2],c=conversation(id,actor);
        if(endpoint==='history' && method==='GET')return answer(history(id,actor));
        if(endpoint==='context' && method==='GET')
          return answer({conversationId:id,version:c.version,entities:[],relationships:[]});
        if(endpoint==='agreement-formation' && method==='GET')
          return answer(formation(id,actor));
        if(endpoint==='turns' && method==='POST'){
          if(typeof body.message!=='string'||!body.message.trim())
            reject(422,'A real message is required');
          const turnKey=typeof body.clientTurnId==='string'?body.clientTurnId:'missing-turn-id';
          const priorReply=c.replyByAction[turnKey];
          if(priorReply){
            const old=c.entries.find(e=>e.id===priorReply);
            return answer({protocolVersion:'1',message:old?.text||'Sample replay',
              contextUpdates:[],components:[],contextualPanel:null,suggestedActions:[],
              replyId:priorReply,understandingChanged:false});
          }
          c.entries.push({id:turnKey,sender:'HUMAN',text:body.message.trim(),occurredAt:DATE});
          const replyId=newId();
          const text=explain(body.message);
          c.entries.push({id:replyId,sender:'KS001',text,occurredAt:DATE});
          c.replyByAction[turnKey]=replyId;c.version++;persist();
          return answer({protocolVersion:'1',message:text,contextUpdates:[],
            components:[],contextualPanel:null,suggestedActions:[],
            replyId,understandingChanged:false});
        }
        if(endpoint==='saved-build' && method==='POST'){
          auth();
          current().saved[actor]=true;
          current().savedConversations[actor]=id;
          persist();
          return answer(savedBuild(actor));
        }
      }
      if(p==='/api/agent/saved-builds' && method==='GET'){
        const person=auth();
        return answer(current().saved[person]?[savedBuild(person)]:[]);
      }
      m=match(/^\/api\/agent\/saved-builds\/([^/]+)\/resume$/);
      if(m && method==='POST'){
        const person=auth();
        if(!current().saved[person]||savedBuild(person).savedBuildId!==m[1])
          reject(403,'Saved sample work belongs to another account');
        return answer(savedBuild(person));
      }

      // M5 Store reads use the SAME real StoreGateway contract, but this
      // demo only returns the two fictional records above.
      if(p==='/api/v1/stores/search' && method==='GET'){
        const category=(url.searchParams.get('category')||'').trim().toLowerCase();
        const kind=url.searchParams.get('kind')||'PRODUCT';
        const limit=Math.min(10,Math.max(1,Number(url.searchParams.get('limit')||10)));
        if(!category)return answer([]);
        return answer(sampleStores.flatMap(store=>store.offers.filter(offer=>
          offer.kind===kind &&
          (offer.title.toLowerCase().includes(category) ||
           category.includes('chair') && offer.title.toLowerCase().includes('chair'))
        ).map(offer=>({
          canonicalKsNumber:store.canonicalKsNumber,displayName:store.displayName,
          locationLabel:store.profile.locationLabel,offer,
        }))).slice(0,limit));
      }
      let storeMatch=match(/^\/api\/v1\/stores\/(KS\d{3,12})(?:\/offers\/([0-9a-fA-F-]{36}))?$/);
      if(storeMatch && method==='GET'){
        const store=demoStore(storeMatch[1]);
        if(!storeMatch[2])return answer(store);
        const offer=store.offers.find(item=>item.id===storeMatch[2]);
        if(!offer)reject(404,'Sample Store offer was not found');
        return answer({...store,offer});
      }
      const sourceMatch=match(/^\/api\/agent\/conversations\/([^/]+)\/commercial-source$/);
      if(sourceMatch && method==='POST'){
        if(!actor)reject(401,'Select a sample participant');
        const c=conversation(sourceMatch[1],actor);
        if(body.sourceType!=='STORE_LISTING'||
          typeof body.sourceOwnerKsNumber!=='string'||
          typeof body.sourceId!=='string')reject(422,'Sample Store source is not valid');
        const store=demoStore(body.sourceOwnerKsNumber);
        const offer=store.offers.find(item=>item.id===body.sourceId);
        if(!offer)reject(404,'The sample Store offer was not found');
        c.selectedOffer=offer.id;persist();
        return answer({
          sourceType:'STORE_LISTING',sourceId:offer.id,sourceTitle:offer.title,
          sourceOwnerKsNumber:store.canonicalKsNumber,
          contextReference:'Sample published offer only',
          capturedPriceMinor:offer.priceMinor,capturedCurrency:offer.currency,
          originatingKsNumber:store.canonicalKsNumber,
          selectedAt:DATE,
        });
      }

      if(p==='/api/v1/me/agreements' && method==='GET'){
        const person=auth();const available=person==='amina'||current().joined;
        const page=Number(url.searchParams.get('page')||0);
        const items=available&&page===0?[summary(person)]:[];
        return answer({items,page,size:20,totalElements:available?1:0});
      }
      if(p==='/api/v1/agreement-invitations/me' && method==='GET'){
        const person=auth();
        const available=person==='njeri'&&current().invitationStatus!=='REVOKED';
        return answer({items:available?[invitationRow()]:[],page:0,size:20,
          totalElements:available?1:0});
      }
      m=match(/^\/api\/v1\/agreement-invitations\/me\/([^/]+)(\/join)?$/);
      if(m){
        const person=auth();
        if(person!=='njeri'||m[1]!==ID.invitation || current().invitationStatus==='REVOKED')
          reject(403,'Invitation belongs to another sample account');
        if(m[2]==='/join'&&method==='POST'){
          current().joined=true;current().invitationStatus='JOINED';persist();
          return answer({agreementId:ID.agreement,publicReference:'DEMO-AGR-041',
            participantId:ID.njeriPerson,role:'SELLER',
            participantStatus:current().confirmed?'CONFIRMED':'JOINED_UNCONFIRMED',
            joinedVersionId:ID.version,joinedVersionNumber:2,
            confirmationRequired:!current().confirmed,joinedAt:DATE,
            notice:'Joined, not agreed'});
        }
        if(!m[2]&&method==='GET'){
          if(!current().joined)current().invitationStatus='VIEWED';
          persist();
          return answer({publicReference:'DEMO-AGR-041',
            title:'40 chairs for Varsityville',
            purpose:'Chairs and delivery to Ruiru',
            intendedRole:'SELLER',currency:'KES',proposedAmountMinor:400000,
            invitationExpiresAt:LATER,proposalVersionNumber:2,isCurrentVersion:true,
            inviterDisplayName:'Amina',inviterCanonicalKsNumber:'DEMO-A',
            notice:'Reviewing is not joining or confirming',
            targetKind:'KS_NUMBER',targetHint:'DEMO-N'});
        }
      }

      m=match(/^\/api\/v1\/agreements\/([^/]+)(?:\/(.*))?$/);
      if(m){
        const person=auth();
        if(m[1]!==ID.agreement)reject(404,'Sample Agreement not found');
        const tail=m[2]||'';
        if(tail==='detail'&&method==='GET'){
          requireAgreement(person);return answer(detail(person));
        }
        if(tail==='versions'&&method==='GET'){
          requireAgreement(person);return answer([version()]);
        }
        if(tail==='versions/'+ID.version&&method==='GET'){
          requireAgreement(person);return answer(version());
        }
        if(tail==='versions/'+ID.version+'/confirm'&&method==='POST'){
          if(person!=='njeri'||!current().joined)
            reject(403,'Only the invited and joined sample participant may confirm');
          if(body.expectedVersionNumber!==2||body.expectedContentHash!=='demo-hash-2')
            reject(409,'The reviewed sample Agreement has changed');
          current().confirmed=true;persist();
          return answer({id:newId(),agreementVersionId:ID.version,
            participantId:ID.njeriPerson,versionNumber:2,versionContentHash:'demo-hash-2',
            status:'CONFIRMED',assuranceMethod:'DEMO_NOT_REAL_IDENTITY',
            confirmedAt:DATE,confirmationCurrent:true,reconfirmationRequired:false});
        }
        if(tail==='participants'&&method==='GET'){
          requireAgreement(person);
          return answer([
            {id:ID.aminaPerson,identityId:'demo-a',roleCode:'BUYER',
              participantStatus:'CREATOR',addedAt:DATE},
            {id:ID.njeriPerson,identityId:'demo-n',roleCode:'SELLER',
              participantStatus:current().confirmed?'CONFIRMED':
                current().joined?'JOINED_UNCONFIRMED':'INVITED',addedAt:DATE},
          ]);
        }
        if(person!=='amina')reject(403,'Only the sample creator can invite');
        if(tail==='propose'&&method==='POST')
          return answer({id:ID.agreement,status:'PROPOSED'});
        if(tail==='invitations'&&method==='GET')
          return answer([{id:ID.invitation,roleCode:'SELLER',
            status:current().invitationStatus,issuedAt:DATE,expiresAt:LATER,revokedAt:null}]);
        if(tail==='invitations'&&method==='POST'){
          if(body.intendedKsNumber!=='DEMO-N'&&body.intendedKsNumber!=='KS002')
            reject(404,'Sample KS Number not found');
          current().invitationStatus='ISSUED';current().joined=false;current().confirmed=false;persist();
          return answer({invitationId:ID.invitation,status:'ISSUED',
            invitationToken:null,replayed:true,
            targetKind:'KS_NUMBER',targetHint:'DEMO-N'});
        }
        if(tail==='invitations/'+ID.invitation+'/revoke'&&method==='POST'){
          current().invitationStatus='REVOKED';persist();
          return answer({id:ID.invitation,roleCode:'SELLER',status:'REVOKED',
            issuedAt:DATE,expiresAt:LATER,revokedAt:DATE});
        }
        if(tail==='invitation-targets/by-ks-number'&&method==='GET'){
          const target=url.searchParams.get('ksNumber')||'';
          if(target!=='DEMO-N'&&target!=='KS002')
            reject(404,'Sample identity not found');
          return answer({identityId:'mini-demo-njeri',
            canonicalKsNumber:'DEMO-N',displayName:'Njeri',identityType:'PERSON'});
        }
      }
      reject(404,'This preview action is not simulated; no request was sent');
    }
  };
}

/** Reset only the isolated, sample-only preview between focused tests. */
export function miniDemoReset(){
  state=initialState();
  try{sessionStorage.removeItem(PREVIEW_STORAGE);}catch{/* server/unit runner */}
}
