import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, BookOpenText, CalendarDays, Camera, CheckCircle2,
  ChevronRight, FileText, MapPin, MessageCircle, Pencil, Send, ShieldCheck,
  Store, UserRoundPlus, Heart, Handshake, Settings2, ShoppingBag, UsersRound, X
} from 'lucide-react';
import { buildTimingProposal, type TimingDraft } from '../features/living-workspace/DateTimeTool';
import type { MiniLanguage } from './miniModel';
import type { StoreGateway } from '../api/securepay/store';
import type { AgreementGateway } from '../api/securepay/agreements';
import type { AgreementVersionSummaryResponse } from '../api/securepay/agreements/dto';
import type { MiniSellerHandoffGateway, MiniSellerReviewedHandoff } from './miniSellerAgreementHandoff.mjs';
import { miniSellerCreateCanonicalStoreDraft } from './miniSellerCanonicalStoreBridge.mjs';
import { miniSellerPublishTextOnly } from './miniSellerPublishTextOnly.mjs';
import { miniSellerKs001Statement } from './miniSellerKs001Statement.mjs';
import { MiniSellSecureLinkWalkthrough } from './MiniSellSecureLinkWalkthrough';
import { MiniSellerShareOptions } from './MiniSellerShareOptions';
import { MiniSellerTradeAgain } from './MiniSellerTradeAgain';
import { MiniSellerRelationships } from './MiniSellerRelationships';
import { MiniSellerSaveTemplate } from './MiniSellerSaveTemplate';
import type {MiniTradeMemoryGateway} from '../api/securepay/mini-trade-memory';
import { miniSellerIssueAgreementDoorway } from './miniSellerSecureLinkDoorway.mjs';
import { miniSellerBeginAgreementHandoff, miniSellerReviewAgreementHandoff,
  miniSellerCreateReviewedAgreement, miniSellerProposeAgreement } from './miniSellerAgreementHandoff.mjs';
import {miniSellerPreparedOffer,miniSellerSafeDraft,miniSellerRestoreDraft} from './miniSellerPreparedOffer.mjs';
import {miniSellerTrustExamination} from './miniSellerTrustExamination.mjs';
import {miniSellerLocalExactImageDigest} from './miniSellerLocalExactImageDigest.mjs';
import {miniSellerReviewAnswerPills} from './miniSellerReviewAnswerPills.mjs';

type Shelf = 'describe'|'photos'|'documents'|'places'|'timing'|'people'|null;
type PhotoSource = 'own'|'supplier'|'permission'|'unknown';
type Picture = { name:string; preview:string; source:PhotoSource; supplierPermission?:boolean; localDigest?:string };
type Support = { name:string; purpose:string };
type Person = { name:string; role:string };
type Result = 'share'|'store'|'save'|null;
type Category = 'Goods'|'Agriculture'|'Equipment'|'Furniture'|'Services'|'Capacity';

type ReviewIssue = 'safety'|'regulated'|'photo'|'photo-permission'|'authority'|'availability'|null;
function AnswerPill({children,onClick,selected=false,disabled=false}:{
  children:ReactNode;onClick:()=>void;selected?:boolean;disabled?:boolean;
}){
  return <button type="button" className={'spm-sell-answer-pill'+(selected?' selected':'')}
    aria-pressed={selected} disabled={disabled} onClick={onClick}>{children}</button>;
}
const toolList = [
  {id:'describe' as const, label:'Describe & Present', hint:'Help buyers understand your offer', icon:BookOpenText},
  {id:'photos' as const, label:'Photos', hint:'Show the actual item or an authorised image', icon:Camera},
  {id:'documents' as const, label:'Documents', hint:'Add relevant supporting records', icon:FileText},
  {id:'places' as const, label:'Places', hint:'Where buyers collect, or work takes place', icon:MapPin},
  {id:'timing' as const, label:'Date & Time', hint:'Choose dates, windows or recurring terms', icon:CalendarDays},
  {id:'people' as const, label:'People & Invitations', hint:'Name a buyer, agent or provider', icon:UserRoundPlus},
];

const freshTiming = (): TimingDraft => ({
  mode:'on', purpose:'pickup', freePurpose:'', day:'', time:'', until:'', untilTime:'',
  approximate:'', repeat:'week', weekday:'Friday', monthDay:'5', trigger:'',
  offsetDays:'2', context:'', timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi'
});
const readableAmount = (raw:string) => {
  const amount=Number(raw.replace(/,/g,''));
  return raw.trim() && Number.isFinite(amount) && amount>0
    ? 'KSh '+amount.toLocaleString('en-KE',{maximumFractionDigits:2}) : '';
};
function writeDescription(input:{
  title:string; category:Category; condition:string; specifications:string;
  purpose:string; included:string; limitations:string; warranty:string;
}):string {
  const title=input.title.trim();
  return [
    title ? title+'.' : '',
    input.specifications.trim() ? 'Details: '+input.specifications.trim()+'.' : '',
    input.condition.trim() ? 'Condition: '+input.condition.trim()+'.' : '',
    input.purpose.trim() ? 'Suitable for: '+input.purpose.trim()+'.' : '',
    input.included.trim() ? 'Included: '+input.included.trim()+'.' : '',
    input.limitations.trim() ? 'Important to know: '+input.limitations.trim()+'.' : '',
    input.warranty.trim() ? 'Warranty or after-sale terms: '+input.warranty.trim()+'.' : ''
  ].filter(Boolean).join('\n').replace(/\.\./g,'.');
}

/** Human-facing owner preview, within the REAL Mini shell. It has no Store,
 * Identity, Agreement, media-provenance, invitation, SecureLink or Money writes.
 * Local declaration is not verification; local output is not a canonical offer.
 */
export function MiniSellSomething({language,onBack,onOpenStore,onOpenSettings,onBrowseStores,actingAs,seed='',storeGateway,sellerContext,agreementGateway,handoffGateway,memoryGateway,sellerSavedSource,onPrepareInKs001,previewSecureLinkJourney=false}:{
  language:MiniLanguage;onBack:()=>void;onOpenStore:()=>void;onOpenSettings:()=>void;
  onBrowseStores:()=>void;actingAs:string;seed?:string;
  storeGateway?:StoreGateway;
  sellerContext?:{type:'personal'}|{type:'business';businessKsNumber:string};
  agreementGateway?:Pick<AgreementGateway,'activeDoorway'|'issuePublicDoorway'|'detail'|'proposeReviewed'|'currentUserAgreements'>;
  handoffGateway?:MiniSellerHandoffGateway;
  memoryGateway?:MiniTradeMemoryGateway;
  /** Trusted saved KS001 conversation context, never a local Mini draft ID. */
  sellerSavedSource?:{conversationId:string;reviewedTradeContextVersion:number};
  /** Deliberate user-authored turn in an actual authenticated KS001 conversation. */
  onPrepareInKs001?:(statement:string)=>Promise<
    {conversationId:string;reviewedTradeContextVersion:number}|null>;
  /** Isolated owner demo only; never provide a real SecureLink or account gateway. */
  previewSecureLinkJourney?:boolean;
}) {
  const sw=language==='sw';
  const [stage,setStage]=useState<'compose'|'review'|'result'>('compose');
  const [sellerArea,setSellerArea]=useState<'offer'|'quick'|'relationships'>('offer');
  const [shelf,setShelf]=useState<Shelf>(null);
  const [toolsOpen,setToolsOpen]=useState(false);
  const [showMorePills,setShowMorePills]=useState(false);
  const [returningToReview,setReturningToReview]=useState(false);
  const [photoUncertain,setPhotoUncertain]=useState(false);
  const [authorityUncertain,setAuthorityUncertain]=useState(false);
  const [title,setTitle]=useState(seed.slice(0,240));
  const [category,setCategory]=useState<Category>('Goods');
  const [priceType,setPriceType]=useState<'fixed'|'quote'>('fixed');
  const [price,setPrice]=useState('');
  const [quantity,setQuantity]=useState('');
  const [unit,setUnit]=useState('each');
  const [condition,setCondition]=useState('');
  const [specifications,setSpecifications]=useState('');
  const [purpose,setPurpose]=useState('');
  const [included,setIncluded]=useState('');
  const [limitations,setLimitations]=useState('');
  const [warranty,setWarranty]=useState('');
  const [description,setDescription]=useState('');
  const [descriptionReviewed,setDescriptionReviewed]=useState(false);
  const [pictures,setPictures]=useState<Picture[]>([]);
  const [documents,setDocuments]=useState<Support[]>([]);
  const [docPurpose,setDocPurpose]=useState('Product specification');
  const [placeType,setPlaceType]=useState<'Pickup'|'Delivery'|'Work location'>('Pickup');
  const [place,setPlace]=useState('');
  const [privateMeeting,setPrivateMeeting]=useState('');
  const [timingDraft,setTimingDraft]=useState<TimingDraft>(freshTiming);
  const [timing,setTiming]=useState('');
  const [people,setPeople]=useState<Person[]>([]);
  const [personName,setPersonName]=useState('');
  const [personRole,setPersonRole]=useState('Buyer');
  const [personPlan,setPersonPlan]=useState<'later'|'securelink'|null>(null);
  const [showPersonEntry,setShowPersonEntry]=useState(false);
  const [peopleHint,setPeopleHint]=useState(false);
  const [rightToOffer,setRightToOffer]=useState(false);
  const [rightType,setRightType]=useState('Owner');
  const [stockStatement,setStockStatement]=useState('');
  const [error,setError]=useState('');
  const [result,setResult]=useState<Result>(null);
  const [canonicalStoreStatus,setCanonicalStoreStatus]=useState('');
  const [canonicalOfferId,setCanonicalOfferId]=useState<string|null>(null);
  const [storeCreating,setStoreCreating]=useState(false);
  const [storePublishing,setStorePublishing]=useState(false);
  const [storePublished,setStorePublished]=useState(false);
  const [savedStoreRevision,setSavedStoreRevision]=useState<string|null>(null);
  const [storeSnapshotSignature,setStoreSnapshotSignature]=useState<string|null>(null);
  const [shareCreating,setShareCreating]=useState(false);
  const [shareStatus,setShareStatus]=useState('');
  const [shareUrl,setShareUrl]=useState<string|null>(null);
  const [shareIssued,setShareIssued]=useState(false);
  const shareKey=useRef<string|null>(null);
  const handoffKey=useRef<string|null>(null);
  const [handoffBusy,setHandoffBusy]=useState(false);
  const [sourceSaving,setSourceSaving]=useState(false);
  const [trustedSellerSource,setTrustedSellerSource]=useState<
    {conversationId:string;reviewedTradeContextVersion:number}|null>(null);
  const [sourceSignature,setSourceSignature]=useState<string|null>(null);
  const [handoffMessage,setHandoffMessage]=useState('');
  const [serverReview,setServerReview]=useState<MiniSellerReviewedHandoff|null>(null);
  const [reviewAcknowledged,setReviewAcknowledged]=useState(false);
  const [reviewedOfferSignature,setReviewedOfferSignature]=useState<string|null>(null);
  const [realDraftAgreement,setRealDraftAgreement]=useState<{
    id:string;status:'DRAFT';version:AgreementVersionSummaryResponse
  }|null>(null);
  const [proposedAgreement,setProposedAgreement]=useState<{
    id:string;status:'PROPOSED';version:AgreementVersionSummaryResponse
  }|null>(null);
  const [ksHelp,setKsHelp]=useState(false);
  const [tradeAgainNotice,setTradeAgainNotice]=useState('');
  const photoRef=useRef<HTMLInputElement>(null);
  const docRef=useRef<HTMLInputElement>(null);
  const [photoCount,setPhotoCount]=useState(0);
  const [savedDraftAvailable,setSavedDraftAvailable]=useState(()=>{
    try{return miniSellerRestoreDraft(JSON.parse(sessionStorage.getItem('securepay-mini-sell-preview-draft-v2')||'null'))!==null;}
    catch{return false;}
  });
  const prepared=miniSellerPreparedOffer({
    title,category,priceType,price,quantity,unit,description,descriptionReviewed,
    condition,specifications,purpose,included,limitations,warranty,
    availability:stockStatement,rightToOffer,rightType,photos:pictures,documents,people,
    placeType,place,privateMeeting,timing
  });
  const offerSignature=JSON.stringify([prepared.ok?prepared.offerTerms:null,
    pictures.map(p=>p.localDigest||null),rightToOffer,stockStatement]);
  const unchangedAfterReview=reviewedOfferSignature===offerSignature;
  const linkedKs001Source=trustedSellerSource??sellerSavedSource;
  const sourceMatchesOffer=sellerSavedSource?true:sourceSignature===offerSignature;
  const invalidPrice=priceType==='fixed' && !readableAmount(price);
  const suspicious=useMemo(()=>/\b(?:stolen|counterfeit|fake passport|ivory|illegal drugs|firearms?|ammunition)\b/i.test(title+' '+description),[title,description]);
  const sensitive=useMemo(()=>/\b(?:medicine|pharmaceutical|pesticide|alcohol|vehicle registration)\b/i.test(title+' '+description),[title,description]);
  const imageNeedsSource=pictures.some(p=>p.source==='unknown'||(p.source==='supplier'&&!p.supplierPermission));
  const pendingPhotoIndex=pictures.findIndex(p=>p.source==='unknown'||(p.source==='supplier'&&!p.supplierPermission));
  // The examiner asks one small question, with a meaningful pill for every answer.
  // Seller declarations are NOT legal, image, licence, identity or stock verification.
  const currentQuestion:ReviewIssue=suspicious?'safety':sensitive?'regulated':
    pendingPhotoIndex>=0?(pictures[pendingPhotoIndex].source==='supplier'?'photo-permission':'photo'):
    !rightToOffer?'authority':!stockStatement.trim()?'availability':null;
  const trust=miniSellerTrustExamination({
    title,description,descriptionReviewed,photos:pictures,documents,rightToOffer,rightType,
    stockStatement,suspicious,sensitive
  });
  // Local example ONLY. Real reviewer questions come from authenticated Store
  // APIs; this browser draft has no source IDs, evidence uploads or decisions.
  const exampleReviewerQuestion=pictures.length?
    miniSellerReviewAnswerPills('MORE_INFORMATION_REQUIRED',
      pictures[0]?.source==='supplier'?'SUPPLIER_PERMISSION':'PHOTO_SOURCE'):null;
  // A local, fictional offer-review path only. Trust.canPublish is ALWAYS false.
  const canOffer=prepared.ok&&!invalidPrice&&!suspicious&&!sensitive&&
    rightToOffer&&!imageNeedsSource&&!!stockStatement.trim()&&trust.localReady;
  const photoSourceName=(source:PhotoSource)=>({
    own:'Photo I took',supplier:'Supplier image (permission declared)',
    permission:'Photo used with permission',unknown:'Source not stated'
  })[source];
  const openReviewTool=(tool:Exclude<Shelf,null>)=>{
    setReturningToReview(true);setStage('compose');setSellerArea('offer');setToolsOpen(true);setShelf(tool);setError('');
  };
  const photoAnswered=(source:Exclude<PhotoSource,'unknown'>)=>{
    setPictures(current=>current.map((picture,i)=>i===pendingPhotoIndex?
      {...picture,source,supplierPermission:source==='supplier'?false:true}:picture));
    setPhotoUncertain(false);
  };
  const authorityAnswered=(role:string)=>{setRightType(role);setRightToOffer(true);setAuthorityUncertain(false);};
  useEffect(()=>{
    if(stage==='compose'&&toolsOpen&&shelf){
      document.querySelector('[data-mini-sell-tool-panel]')?.scrollIntoView({block:'start',behavior:'smooth'});
    }else if(stage==='review'){
      document.querySelector('[data-mini-sell-review]')?.scrollIntoView({block:'start',behavior:'smooth'});
    }
  },[stage,shelf,toolsOpen]);
  const refreshDescription=()=>{setDescriptionReviewed(false);setError('');};
  // Progressive disclosure: one gentle next-step suggestion, never a compulsory tool.
  const suggestion=useMemo<{id:Exclude<Shelf,null>;message:string}|null>(()=>{
    const words=title.toLowerCase();
    if(!title.trim())return null;
    if(pictures.length&&!descriptionReviewed)
      return {id:'describe',message:'Want help describing what is in your photo?'};
    if(sensitive&&!documents.length)
      return {id:'documents',message:'This item may need a licence or supporting document.'};
    if(/\b(?:deliver|delivery|collect|collection|pickup|pick-up)\b/.test(words)&&!place)
      return {id:'places',message:'Where will the buyer collect or receive it?'};
    if(/\b(?:tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|appointment)\b/.test(words)&&!timing)
      return {id:'timing',message:'Add a proposed date or time?'};
    if(/\b(?:buyer|customer|client)\b/.test(words)&&!people.length)
      return {id:'people',message:'Want to name the buyer or agent?'};
    if(!descriptionReviewed)
      return {id:'describe',message:'I can help make this offer clearer to buyers.'};
    return null;
  },[title,pictures.length,descriptionReviewed,sensitive,documents.length,place,timing,people.length]);
  const openSuggestedTool=()=>{
    if(!suggestion)return;
    setToolsOpen(true);setShelf(suggestion.id);setError('');
  };
  const fields = {title,category,condition,specifications,purpose,included,limitations,warranty};
  const remainingQuestions=[
    imageNeedsSource?'photograph':null,
    !rightToOffer?'right to sell':null,
    !stockStatement.trim()?'availability':null
  ].filter((value):value is string=>value!==null);
  const choosePhoto=async(file?:File)=>{
    if(!file)return;
    setError('');
    if(!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024||file.size===0) {
      setError('Choose a JPG or PNG photo up to 5 MB. Nothing was uploaded.');return;
    }
    if(pictures.length>=4){setError('You can add up to four photographs in this first preview.');return;}
    const localDigest=await miniSellerLocalExactImageDigest(file);
    if(localDigest&&pictures.some(p=>p.localDigest===localDigest)){
      setError('This exact photo is already in your offer. You can keep the existing one.');return;
    }
    const reader=new FileReader();
    reader.onload=()=>{
      if(typeof reader.result!=='string')return;
      setPictures(current=>[...current,{name:file.name.slice(0,100),preview:reader.result as string,source:'unknown' as PhotoSource,supplierPermission:false,localDigest:localDigest||undefined}].slice(0,4));
      setPhotoCount(n=>n+1);
    };
    reader.onerror=()=>setError('The photo could not be opened. Nothing was uploaded.');
    reader.readAsDataURL(file);
  };
  const chooseDocument=(file?:File)=>{
    if(!file)return;
    setError('');
    const types=['application/pdf','text/plain','text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if(file.size===0||file.size>15*1024*1024||(!types.includes(file.type)&&!/\.(pdf|txt|csv|docx|xlsx)$/i.test(file.name))){
      setError('Choose a PDF, Word, spreadsheet or text file up to 15 MB.');return;
    }
    if(documents.length>=5){setError('This preview can show up to five documents.');return;}
    setDocuments(x=>[...x,{name:file.name.slice(0,120),purpose:docPurpose}]);
  };
  const reviewOffer=()=>{
    setError('');
    if(!title.trim()){setError('What are you selling? A short name is enough.');return;}
    if(invalidPrice){setError('Enter a positive price or choose Price to agree.');return;}
    if(!prepared.ok){setError(prepared.error);return;}
    setShelf(null);setReturningToReview(false);setShowMorePills(false);setStage('review');
  };
  const finish=(kind:Result)=>{
    if(kind!=='save'&&!canOffer)return;
    if(kind==='save'){
      try{
        sessionStorage.setItem('securepay-mini-sell-preview-draft-v2',JSON.stringify(miniSellerSafeDraft({
          title,category,priceType,price,quantity,unit,condition,specifications,purpose,
          included,limitations,warranty,description,descriptionReviewed,placeType,
          place,timing,stockStatement
        })));
        setSavedDraftAvailable(true);
      }catch{setSavedDraftAvailable(false);}
    }
    setResult(kind);setStage('result');
  };
  const createRealStoreDraft=async()=>{
    if(!storeGateway||!sellerContext||!prepared.ok||storeCreating||canonicalOfferId)return;
    setStoreCreating(true);setCanonicalStoreStatus('');
    try{
      const receipt=await miniSellerCreateCanonicalStoreDraft({
        prepared,gateway:storeGateway,context:sellerContext,confirmed:true
      });
      if(receipt.ok){
        setCanonicalOfferId(receipt.offerId);
        setSavedStoreRevision(receipt.offerUpdatedAt);
        setStoreSnapshotSignature(offerSignature);
        setCanonicalStoreStatus('Saved to your Store as a private draft. Nothing is published or sent.');
      }else{
        setCanonicalStoreStatus(receipt.reason==='CHECK_MY_STORE_BEFORE_RETRY'
          ? 'The result is uncertain. Check My Store before trying again.'
          : 'The Store draft could not be saved. Nothing was published.');
      }
    } finally {setStoreCreating(false);}
  };
  const publishRealStoreText=async()=>{
    if(!storeGateway||!sellerContext||!prepared.ok||!canonicalOfferId||
       !savedStoreRevision||storePublishing||storePublished||
       storeSnapshotSignature!==offerSignature)return;
    setStorePublishing(true);setCanonicalStoreStatus('');
    try{
      const issued=await miniSellerPublishTextOnly({
        prepared,
        draft:{ok:true,offerId:canonicalOfferId,offerUpdatedAt:savedStoreRevision,published:false},
        gateway:storeGateway,context:sellerContext,confirmed:true,
        localOfferUnchanged:storeSnapshotSignature===offerSignature
      });
      if(issued.ok){
        setStorePublished(true);
        setCanonicalStoreStatus('Your text-only listing is visible in your Store. Buyers must still confirm availability before an Agreement.');
      }else{
        setCanonicalStoreStatus(issued.reason==='CURRENT_STORE_REVISION_CHANGED'
          ? 'Your Store listing changed. Open My Store and review the current details before publishing.'
          :issued.reason==='CHECK_MY_STORE_BEFORE_RETRY'
          ? 'SecurePay could not confirm publication. Check My Store before trying again.'
          :'This listing could not be published. It remains private until SecurePay confirms otherwise.');
      }
    }finally{setStorePublishing(false);}
  };
  const prepareOfferInKs001=async()=>{
    if(!onPrepareInKs001||!prepared.ok||!canOffer||sourceSaving||handoffBusy||
       realDraftAgreement||proposedAgreement)return;
    const composed=miniSellerKs001Statement({prepared});
    if(!composed.ok){
      setHandoffMessage(composed.reason==='TERMS_TOO_LONG_FOR_SINGLE_KS001_TURN'
        ? 'Your offer has more details than one KS001 message can safely carry. Open KS001 to review them in smaller parts; no terms were sent or shortened.'
        : composed.reason==='DESCRIPTION_REVIEW_REQUIRED'
        ? 'Please review your description first. KS001 must not prepare an Agreement from wording you have not approved.'
        : 'Complete and review your offer before preparing its Agreement.');
      return;
    }
    setSourceSaving(true);setHandoffMessage('');
    try {
      const source=await onPrepareInKs001(composed.statement);
      if(source?.conversationId&&Number.isSafeInteger(source.reviewedTradeContextVersion)){
        setTrustedSellerSource(source);
        setSourceSignature(offerSignature);
        setServerReview(null);
        setReviewAcknowledged(false);
        setReviewedOfferSignature(null);
        handoffKey.current=null;
        setHandoffMessage('KS001 has recorded your offer. Now review the Agreement it prepares.');
      }else{
        setHandoffMessage('KS001 could not confirm your offer. Check the current conversation before trying again.');
      }
    }finally{setSourceSaving(false);}
  };
  const reviewSavedOfferInSecurePay=async()=>{
    if(!handoffGateway||!linkedKs001Source||!sourceMatchesOffer||!prepared.ok||!canOffer||
        handoffBusy||realDraftAgreement)return;
    setHandoffBusy(true);setHandoffMessage('');
    try {
      handoffKey.current??=crypto.randomUUID();
      const started=await miniSellerBeginAgreementHandoff({
        gateway:handoffGateway,
        conversationId:linkedKs001Source.conversationId,
        reviewedTradeContextVersion:linkedKs001Source.reviewedTradeContextVersion,
        clientActionId:handoffKey.current,confirmed:true
      });
      if(!started.ok){
        setHandoffMessage(started.reason==='CHECK_EXISTING_HANDOFF_BEFORE_RETRY'
          ? 'SecurePay could not confirm this step. Check the saved KS001 conversation before trying again.'
          : 'Save and review this offer in KS001 before preparing its Agreement.');
        return;
      }
      const reviewed=await miniSellerReviewAgreementHandoff({
        gateway:handoffGateway,handoffId:started.handoffId
      });
      if(!reviewed.ok){
        setHandoffMessage('Open KS001 to finish clarifying the Agreement terms.');
        return;
      }
      setServerReview(reviewed);
      setReviewedOfferSignature(offerSignature);
      setReviewAcknowledged(false);
      setHandoffMessage(reviewed.canProgress
        ? 'These are the Agreement terms SecurePay has recorded. Please check them.'
        : 'The Agreement needs another clarification in KS001 before it can be set up.');
    }finally{setHandoffBusy(false);}
  };
  const setUpReviewedAgreement=async()=>{
    if(!handoffGateway||!agreementGateway||!serverReview?.canProgress||
       !reviewAcknowledged||!unchangedAfterReview||handoffBusy||realDraftAgreement)return;
    setHandoffBusy(true);setHandoffMessage('');
    try {
      const created=await miniSellerCreateReviewedAgreement({
        gateway:handoffGateway,agreements:agreementGateway,
        reviewed:serverReview,sellerConfirmed:true
      });
      if(created.ok){
        setRealDraftAgreement({id:created.agreementId,status:'DRAFT',version:created.agreementVersion});
        setHandoffMessage('Your draft Agreement is saved. It has not been shared.');
      }else{
        setHandoffMessage(created.reason==='REVIEW_CHANGED_REFRESH_REQUIRED'
          ? 'The Agreement changed. Please review the current terms again.'
          : 'SecurePay could not confirm the draft. Check this Agreement in KS001 before retrying.');
      }
    }finally{setHandoffBusy(false);}
  };
  const proposeReviewedAgreement=async()=>{
    if(!agreementGateway||!realDraftAgreement||!unchangedAfterReview||
       proposedAgreement||handoffBusy)return;
    setHandoffBusy(true);setHandoffMessage('');
    try{
      const proposed=await miniSellerProposeAgreement({
        agreements:agreementGateway,agreementId:realDraftAgreement.id,
        expectedAgreementVersion:realDraftAgreement.version,confirmed:true
      });
      if(proposed.ok){
        setProposedAgreement({id:proposed.agreementId,status:'PROPOSED',version:proposed.agreementVersion});
        setHandoffMessage('Your Agreement is ready for buyer review. No invitation has been sent.');
      }else{
        setHandoffMessage('Review the current draft Agreement in KS001 before proposing it.');
      }
    }finally{setHandoffBusy(false);}
  };
  const issueSecureLink=async()=>{
    // Only issue from an actual proposed Agreement. No local proposal or
    // Store ID can become a SecureLink without canonical Agreement authority.
    if(!agreementGateway||!proposedAgreement||!prepared.ok||!canOffer||
        !unchangedAfterReview||shareCreating||shareIssued)return;
    setShareCreating(true);setShareStatus('');
    try{
      // Check the exact proposed Agreement revision that the seller confirmed
      // before issuing its external doorway. The backend still owns authority.
      const current=await agreementGateway.detail(proposedAgreement.id);
      if(current?.overview?.status!=='PROPOSED'||
          current.overview.agreementId!==proposedAgreement.id||
          current.currentVersion?.versionId!==proposedAgreement.version.versionId||
          current.currentVersion?.versionNumber!==proposedAgreement.version.versionNumber||
          current.currentVersion?.contentHash!==proposedAgreement.version.contentHash){
        setShareStatus('This Agreement has changed. Open it and review the current version before sharing.');
        return;
      }
      shareKey.current??=crypto.randomUUID();
      const issued=await miniSellerIssueAgreementDoorway({
        gateway:agreementGateway,agreement:proposedAgreement,
        idempotencyKey:shareKey.current,confirmed:true
      });
      if(issued.ok){
        setShareIssued(true);
        setShareUrl(issued.publicUrl);
        setShareStatus(issued.publicUrl
          ? 'Your SecureLink is ready. You decide who to send it to.'
          : 'The SecureLink was issued, but a sharing address is not configured here.');
      }else if(issued.reason==='EXISTING_SECURELINK_MANAGE_IN_AGREEMENT'){
        setShareStatus('This Agreement already has a SecureLink. Open the Agreement to manage it.');
      }else if(issued.reason==='CHECK_AGREEMENT_BEFORE_RETRY'){
        setShareStatus('SecurePay could not confirm this request. Check your Agreement before trying again.');
      }else{
        setShareStatus('SecureLink cannot be issued until this Agreement is ready for sharing.');
      }
    }finally{setShareCreating(false);}
  };
  const restoreSavedOffer=()=>{
    try{
      const saved=miniSellerRestoreDraft(JSON.parse(sessionStorage.getItem('securepay-mini-sell-preview-draft-v2')||'null'));
      if(!saved){setSavedDraftAvailable(false);setError('This tab no longer has a saved offer.');return;}
      setTitle(saved.title);setCategory(saved.category as Category);
      setPriceType(saved.priceType as 'fixed'|'quote');setPrice(saved.price);
      setQuantity(saved.quantity);setUnit(saved.unit);
      setCondition(saved.condition);setSpecifications(saved.specifications);setPurpose(saved.purpose);
      setIncluded(saved.included);setLimitations(saved.limitations);setWarranty(saved.warranty);
      setDescription(saved.description);setDescriptionReviewed(false); // The seller reviews the restored wording again.
      setPlaceType(saved.placeType as 'Pickup'|'Delivery'|'Work location');
      setPlace(saved.place);setTiming(saved.timing);setStockStatement(saved.stockStatement);
      // No file, contact, permissions, identity or statement of verified authority persists.
      setPictures([]);setDocuments([]);setPeople([]);setPrivateMeeting('');
      setPersonPlan(null);setRightToOffer(false);setStage('compose');setSellerArea('offer');
      setError('');setShelf(null);setToolsOpen(false);
    }catch{setSavedDraftAvailable(false);setError('This tab could not restore that offer.');}
  };
  // Phase 6A: use only a newly verified title as a suggestion, never an old
  // Agreement's promises, buyer, price, invitation, acceptance or payment.
  // Reset every mutable draft and canonical-handoff state before starting.
  const startFreshFromPreviousTrade=(priorTitle:string,terms='',timingProposal='')=>{
    setTitle(priorTitle);setCategory('Goods');setPriceType('fixed');setPrice('');
    setQuantity('');setUnit('each');setCondition('');setSpecifications('');
    setPurpose('');setIncluded('');setLimitations('');setWarranty('');
    setDescription(terms);setDescriptionReviewed(false);
    setPictures([]);setDocuments([]);setDocPurpose('Product specification');
    setPlaceType('Pickup');setPlace('');setPrivateMeeting('');
    setTiming(timingProposal);setTimingDraft(freshTiming());
    setPeople([]);setPersonName('');setPersonRole('Buyer');
    setPersonPlan(null);setShowPersonEntry(false);setPeopleHint(false);
    setRightToOffer(false);setRightType('Owner');setStockStatement('');
    setAuthorityUncertain(false);setPhotoUncertain(false);
    setResult(null);setStage('compose');setSellerArea('offer');
    setToolsOpen(false);setShelf(null);setShowMorePills(false);
    setReturningToReview(false);setKsHelp(false);setError('');
    setCanonicalOfferId(null);setSavedStoreRevision(null);
    setStoreSnapshotSignature(null);setStorePublished(false);
    setCanonicalStoreStatus('');setStoreCreating(false);setStorePublishing(false);
    setShareIssued(false);setShareUrl(null);setShareStatus('');
    shareKey.current=null;handoffKey.current=null;
    setTrustedSellerSource(null);setSourceSignature(null);setSourceSaving(false);
    setServerReview(null);setReviewedOfferSignature(null);
    setReviewAcknowledged(false);setRealDraftAgreement(null);
    setProposedAgreement(null);setHandoffMessage('');setHandoffBusy(false);
    setTradeAgainNotice('New offer prepared. Any reused wording or repeat dates are proposals only. Check your right to sell, price, availability and every term again.');
  };
  const sample=()=>{
    setTitle('20 bags of dairy meal animal feed');setCategory('Agriculture');
    setPrice('2500');setPriceType('fixed');setQuantity('20');setUnit('bags');
    setSpecifications('50 kg bags · dairy meal');setCondition('New, sealed');
    setPurpose('Dairy cattle feeding');setIncluded('20 sealed bags');
    setLimitations('Buyer to confirm feed formulation and expiry dates before collection');
    setWarranty('');setDescription('');setDescriptionReviewed(false);
    setStockStatement('Seller says 20 bags available — not verified');
    setRightType('Owner');setRightToOffer(false);
    setError('');setToolsOpen(true);setShelf('describe');
  };
  const label=(text:string,id:string,value:string,set:(v:string)=>void,placeholder:string,rows=0)=>
    <label className="spm-sell-label" htmlFor={id}><span>{text}</span>
      {rows? <textarea id={id} className="spm-field" rows={rows} value={value}
        placeholder={placeholder} maxLength={800} onChange={e=>set(e.target.value)}/> :
        <input id={id} className="spm-field" type="text" value={value}
          placeholder={placeholder} maxLength={300} onChange={e=>set(e.target.value)}/>}
    </label>;
  return <section className="spm-content spm-sell" data-mini-sell-something="preview">
    <button type="button" className="spm-back" onClick={sellerArea!=='offer'?()=>setSellerArea('offer'):stage==='compose'?onBack:()=>{setStage(stage==='result'?'review':'compose');setError('');}}>
      <ArrowLeft size={18}/>{sellerArea!=='offer'?'Sell something':stage==='compose'?'Mini':stage==='result'?'Offer review':'Change offer'}</button>
    <div className="spm-persona"><ShieldCheck size={15}/><span>Sell something</span><span className="spm-dot"/><span>{previewSecureLinkJourney?'Owner walkthrough':'SecurePay Mini'}</span></div>
    {stage==='compose'&&sellerArea==='quick'&&<div className="spm-sell-phase1-destination" data-seller-phase1="quick-contract">
      <div className="spm-sell-phase1-symbol"><Handshake size={25}/></div>
      <h1 className="spm-question">Quick Contract</h1>
      <p className="spm-lead">A quicker way to trade with someone you already know. The terms and each person's agreement must still be checked.</p>
      <div className="spm-sell-phase1-hint">Choose how to begin. The current preview prepares an offer or opens the Store browser; it cannot reuse or sign an existing Agreement.</div>
      <button type="button" className="spm-sell-phase1-link" onClick={()=>{setSellerArea('offer');setToolsOpen(true);setShelf('people');}}>
        <UsersRound size={19}/><span><strong>Start with a person</strong><small>Add the buyer or agent to an offer you will review.</small></span><ChevronRight size={17}/>
      </button>
      <button type="button" className="spm-sell-phase1-link" onClick={onBrowseStores}>
        <ShoppingBag size={19}/><span><strong>Find a Store to trade with</strong><small>Review the current public offer before preparing terms.</small></span><ChevronRight size={17}/>
      </button>
      <MiniSellerTradeAgain gateway={agreementGateway} onStart={startFreshFromPreviousTrade}/>
      <p className="spm-sell-hint">A past trade is only a reference. A new Agreement needs its own independent review and the other person's confirmation.</p>
    </div>}
    {stage==='compose'&&sellerArea==='relationships'&&<div className="spm-sell-phase1-destination" data-seller-phase1="relationships">
      <div className="spm-sell-phase1-symbol"><Heart size={25}/></div>
      <h1 className="spm-question">My People & Favourite Stores</h1>
      <p className="spm-lead">Find the traders and people you return to. Your relationships stay private unless you choose to share them.</p>
      <div className="spm-sell-phase1-hint">Favourites are not yet stored in a verified SecurePay account on this preview. We won't invent a list of people or claim a Store is your favourite.</div>
      <button type="button" className="spm-sell-phase1-link" onClick={onBrowseStores}>
        <ShoppingBag size={19}/><span><strong>Explore Stores</strong><small>Browse current examples. You can return here to sell.</small></span><ChevronRight size={17}/>
      </button>
      <button type="button" className="spm-sell-phase1-link" onClick={()=>{setSellerArea('offer');setToolsOpen(true);setShelf('people');}}>
        <UsersRound size={19}/><span><strong>Prepare an offer for someone</strong><small>Use People & Invitations to name the other party.</small></span><ChevronRight size={17}/>
      </button>
      <MiniSellerRelationships memory={memoryGateway} agreements={agreementGateway}
        stores={storeGateway} onStart={startFreshFromPreviousTrade}/>
      <p className="spm-sell-hint">Nothing is shared with a community or copied from your device contacts.</p>
    </div>}
    {stage==='compose'&&sellerArea==='offer'&&<>
      <div className="spm-sell-phase1-capacity"><span>Acting as <strong>{actingAs}</strong></span><small>Example only · authority not verified</small></div>
      <h1 className="spm-question">{sw?'Unauza nini?':'What are you selling?'}</h1>
      {tradeAgainNotice&&<p className="spm-sell-hint" role="status">{tradeAgainNotice}</p>}
      <p className="spm-lead">Tell Mini a little. Add pictures or details only when they help you make a better offer.</p>
      {savedDraftAvailable&&<button type="button" className="spm-sell-resume" onClick={restoreSavedOffer}>
        <Bookmark size={16}/><span><strong>Continue a saved offer</strong><small>Written details only · in this browser tab</small></span><ChevronRight size={16}/>
      </button>}
      {label('Your item or service','sell-title',title,v=>{setTitle(v);refreshDescription();},'e.g. 20 bags of animal feed',2)}
      <div className="spm-sell-phase2-pricing" data-mini-sell-pricing>
        <strong className="spm-sell-inline-question">How would you price it?</strong>
        <div className="spm-sell-pill-row">
          <AnswerPill selected={priceType==='fixed'} onClick={()=>setPriceType('fixed')}>Set a price</AnswerPill>
          <AnswerPill selected={priceType==='quote'} onClick={()=>setPriceType('quote')}>Price to agree</AnswerPill>
        </div>
        {priceType==='fixed'&&label('Price in KSh per unit','sell-price',price,setPrice,'2,500')}
      </div>
      <div className="spm-sell-grid2">
        {label('Quantity (optional)','sell-quantity',quantity,setQuantity,'20')}
        {label('Unit (optional)','sell-unit',unit,setUnit,'bags, kg, hours')}
      </div>
      {suggestion&&!toolsOpen&&<button type="button" className="spm-sell-suggestion" onClick={openSuggestedTool}>
        <span>{suggestion.message}</span><ChevronRight size={16}/></button>}
      <button type="button" className="spm-sell-tools-toggle" aria-expanded={toolsOpen}
        aria-controls="spm-sell-optional-tools"
        onClick={()=>{setToolsOpen(v=>!v);setShelf(null);setError('');}}>
        <span><BookOpenText size={17}/>Add to or improve your offer</span>
        <ChevronRight size={18} className={toolsOpen?'spm-sell-tools-chevron open':'spm-sell-tools-chevron'}/>
      </button>
      {toolsOpen&&<div id="spm-sell-optional-tools">
      <div className="spm-sell-tool-grid">{toolList.map(({id,label:toolLabel,icon:Icon})=>
        <button type="button" className={'spm-sell-tool'+(shelf===id?' active':'')} aria-expanded={shelf===id}
          key={id} onClick={()=>{setShelf(shelf===id?null:id);setError('');}}>
          <Icon size={18}/><span>{toolLabel}</span>
          {(id==='photos'&&pictures.length>0||id==='documents'&&documents.length>0||
            id==='people'&&people.length>0||id==='timing'&&!!timing||id==='places'&&!!place||
            id==='describe'&&!!descriptionReviewed)&&<CheckCircle2 size={13}/>}
        </button>)}</div>
      {toolsOpen&&shelf&&<div data-mini-sell-tool-panel className="spm-sell-tool-panel" aria-label={toolList.find(t=>t.id===shelf)?.label}>
        <div className="spm-sell-panel-head"><strong>{toolList.find(t=>t.id===shelf)?.label}</strong>
          <button type="button" aria-label="Close tool" onClick={()=>setShelf(null)}><X size={17}/></button></div>
        {shelf==='describe'&&<>
          <p className="spm-sell-hint">A good description helps buyers understand the offer. Only details you supply will appear.</p>
          <strong className="spm-sell-inline-question">What kind of offer?</strong>
          <div className="spm-sell-pill-row">
            <AnswerPill selected={!['Services','Capacity'].includes(category)} onClick={()=>{setCategory('Goods');refreshDescription();}}>Product or goods</AnswerPill>
            <AnswerPill selected={category==='Services'} onClick={()=>{setCategory('Services');refreshDescription();}}>Service or work</AnswerPill>
            <AnswerPill selected={category==='Capacity'} onClick={()=>{setCategory('Capacity');refreshDescription();}}>Available capacity</AnswerPill>
          </div>
          {!['Services','Capacity'].includes(category)&&<label className="spm-sell-label"><span>What kind of goods?</span>
            <select className="spm-field" value={category} onChange={e=>{setCategory(e.target.value as Category);refreshDescription();}}>
              {(['Goods','Agriculture','Equipment','Furniture'] as const).map(c=><option key={c}>{c}</option>)}
            </select></label>}
          {!['Services','Capacity'].includes(category)&&label('Condition','sell-condition',condition,v=>{setCondition(v);refreshDescription();},'New, used, refurbished…')}
          {label(category==='Agriculture'?'Weight, grade, ingredients or variety':category==='Equipment'?'Model, capacity and specifications':category==='Furniture'?'Material and dimensions':category==='Services'?'Scope and deliverables':category==='Capacity'?'Capacity, availability and units':'Specifications or features',
            'sell-specs',specifications,v=>{setSpecifications(v);refreshDescription();},'Only facts you can stand behind',2)}
          {label('What is it suitable for?','sell-purpose',purpose,v=>{setPurpose(v);refreshDescription();},'What would a buyer use it for?')}
          {label('What is included?','sell-included',included,v=>{setIncluded(v);refreshDescription();},'Accessories, quantity, work included…')}
          {label('Important limits or exclusions','sell-limits',limitations,v=>{setLimitations(v);refreshDescription();},'What should the buyer not assume?',2)}
          {label('Warranty / after-sale terms (if any)','sell-warranty',warranty,v=>{setWarranty(v);refreshDescription();},'Do not promise cover you cannot offer')}
          <button type="button" className="spm-secondary spm-sell-wide" disabled={!title.trim()} onClick={()=>{
            setDescription(writeDescription(fields));setDescriptionReviewed(false);setError('');
          }}><BookOpenText size={16}/>Help me write it</button>
          {!!description&&<>{label('Your buyer-facing description','sell-description',description,v=>{setDescription(v);setDescriptionReviewed(false);},'Edit the draft freely',5)}
            <button type="button" className="spm-primary" onClick={()=>{setDescriptionReviewed(true);setShelf(null);}}>
              <CheckCircle2 size={17}/>Use this description</button></>}
          <p className="spm-sell-hint">This preview assembles your own facts; it does not invent specifications or run AI verification.</p>
        </>}
        {shelf==='photos'&&<>
          <p className="spm-sell-hint">Show the actual product or use a supplier image with permission. An Identimark records SecurePay usage, not ownership.</p>
          <input ref={photoRef} className="spm-file-hidden" type="file" accept="image/jpeg,image/png" onChange={e=>{void choosePhoto(e.target.files?.[0]);e.target.value='';}}/>
          <button type="button" className="spm-secondary" onClick={()=>photoRef.current?.click()}><Camera size={16}/>Choose photo</button>
          {pictures.map((p,i)=><div className="spm-sell-photo-record" key={i}>
            <div className="spm-sell-photo-wrap"><img src={p.preview} alt={'Seller-selected '+p.name}/>
              <span>SP · IMG {i+1}</span></div>
            <div className="spm-sell-photo-right"><strong>{p.name}</strong>
              <strong className="spm-sell-inline-question">Where did this photo come from?</strong>
              <div className="spm-sell-pill-row">
                <AnswerPill selected={p.source==='own'} onClick={()=>setPictures(prev=>prev.map((x,j)=>j===i?{...x,source:'own' as PhotoSource}:x))}>I took it</AnswerPill>
                <AnswerPill selected={p.source==='supplier'} onClick={()=>setPictures(prev=>prev.map((x,j)=>j===i?{...x,source:'supplier' as PhotoSource,supplierPermission:false}:x))}>Supplier's image</AnswerPill>
                <AnswerPill selected={p.source==='permission'} onClick={()=>setPictures(prev=>prev.map((x,j)=>j===i?{...x,source:'permission' as PhotoSource,supplierPermission:true}:x))}>With permission</AnswerPill>
                <AnswerPill selected={p.source==='unknown'} onClick={()=>setPhotoUncertain(true)}>Not sure</AnswerPill>
              </div>
              <button className="spm-sell-text-button" type="button" onClick={()=>setPictures(prev=>prev.filter((_,j)=>j!==i))}>Remove</button>
            </div></div>)}
          {photoUncertain&&<p className="spm-sell-hint">If permission is unclear, ask the photo owner or remove the photo. Selecting a source is not an ownership check.</p>}
          <p className="spm-sell-hint">{photoCount} chosen in this session. No upload, ownership proof, duplicate-image scan or genuine Identimark registration has occurred.</p>
        </>}
        {shelf==='documents'&&<>
          <p className="spm-sell-hint">Specifications, ownership evidence, supplier authorisation, warranty or certificates can support an offer. They are not automatically verified.</p>
          <label className="spm-sell-label"><span>What is the document for?</span>
            <select className="spm-field" value={docPurpose} onChange={e=>setDocPurpose(e.target.value)}>
              {['Product specification','Right to sell / authorisation','Warranty terms','Certificate / licence','Other supporting record'].map(x=><option key={x}>{x}</option>)}
            </select></label>
          <input ref={docRef} type="file" className="spm-file-hidden"
            accept=".pdf,.docx,.xlsx,.txt,.csv" onChange={e=>{chooseDocument(e.target.files?.[0]);e.target.value='';}}/>
          <button type="button" className="spm-secondary" onClick={()=>docRef.current?.click()}><FileText size={16}/>Choose document</button>
          {documents.map((d,i)=><div className="spm-sell-data-row" key={i}><FileText size={16}/><span><strong>{d.name}</strong><small>{d.purpose} · local reference only</small></span>
            <button type="button" aria-label={'Remove '+d.name} onClick={()=>setDocuments(x=>x.filter((_,j)=>j!==i))}><X size={17}/></button></div>)}
          <p className="spm-sell-hint">This preview records the filename only. No document has been uploaded, read or verified.</p>
        </>}
        {shelf==='places'&&<>
          <p className="spm-sell-hint">Where does the buyer collect, receive delivery or expect the work?</p>
          <strong className="spm-sell-inline-question">Where does the exchange happen?</strong>
          <div className="spm-sell-pill-row">
            <AnswerPill selected={placeType==='Pickup'&&place!=='To be agreed'} onClick={()=>{setPlaceType('Pickup');if(place==='To be agreed')setPlace('');}}>Buyer collects</AnswerPill>
            <AnswerPill selected={placeType==='Delivery'&&place!=='To be agreed'} onClick={()=>{setPlaceType('Delivery');if(place==='To be agreed')setPlace('');}}>I can deliver</AnswerPill>
            <AnswerPill selected={placeType==='Work location'&&place!=='To be agreed'} onClick={()=>{setPlaceType('Work location');if(place==='To be agreed')setPlace('');}}>Work location</AnswerPill>
            <AnswerPill selected={place==='To be agreed'} onClick={()=>setPlace('To be agreed')}>To agree later</AnswerPill>
          </div>
          {label('Public area, place name, Plus Code or map link','sell-place',place,setPlace,'e.g. Kamakis, Ruiru or a Google Maps link')}
          {label('Specific meeting or access instructions (private)','sell-meeting',privateMeeting,setPrivateMeeting,'Only share with the relevant party when necessary',2)}
          <p className="spm-sell-hint">Typing a location doesn't confirm it. Private meeting details are not shown on the public Store preview.</p>
        </>}
        {shelf==='timing'&&<>
          <p className="spm-sell-hint">Use the same date-and-time proposal rules as the Live Workspace. A proposal is not a confirmed booking.</p>
          <label className="spm-sell-label"><span>What date is this for?</span><select className="spm-field" value={timingDraft.purpose}
            onChange={e=>setTimingDraft(t=>({...t,purpose:e.target.value as TimingDraft['purpose']}))}>
            {(['pickup','delivery','commencement','completion','inspection','other'] as const).map(x=><option key={x} value={x}>{x==='commencement'?'Start of work':x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label>
          {timingDraft.purpose==='other'&&label('What happens?','sell-time-purpose',timingDraft.freePurpose,
            v=>setTimingDraft(t=>({...t,freePurpose:v})),'Describe the event')}
          <strong className="spm-sell-inline-question">What kind of timing?</strong>
          <div className="spm-sell-pill-row">
            <AnswerPill selected={timingDraft.mode==='on'} onClick={()=>setTimingDraft(t=>({...t,mode:'on'}))}>Choose date</AnswerPill>
            <AnswerPill selected={timingDraft.mode==='between'} onClick={()=>setTimingDraft(t=>({...t,mode:'between'}))}>Date range</AnswerPill>
            <AnswerPill selected={timingDraft.mode==='every'} onClick={()=>setTimingDraft(t=>({...t,mode:'every'}))}>Repeating</AnswerPill>
            <AnswerPill selected={timingDraft.mode==='after'} onClick={()=>setTimingDraft(t=>({...t,mode:'after'}))}>After an event</AnswerPill>
          </div>
          {(['on','between'].includes(timingDraft.mode))&&<>
            <label className="spm-sell-label"><span>{timingDraft.mode==='between'?'Start date':'Date'}</span>
              <input type="date" className="spm-field" value={timingDraft.day} onChange={e=>setTimingDraft(t=>({...t,day:e.target.value}))}/></label>
            <label className="spm-sell-label"><span>Time (optional)</span>
              <input type="time" className="spm-field" value={timingDraft.time} onChange={e=>setTimingDraft(t=>({...t,time:e.target.value}))}/></label>
          </>}
          {timingDraft.mode==='between'&&<label className="spm-sell-label"><span>End date</span>
            <input type="date" className="spm-field" min={timingDraft.day||undefined} value={timingDraft.until}
              onChange={e=>setTimingDraft(t=>({...t,until:e.target.value}))}/></label>}
          {timingDraft.mode==='on'&&label('Or describe an approximate date','sell-approx',timingDraft.approximate,
            v=>setTimingDraft(t=>({...t,approximate:v})),'e.g. next Friday morning')}
          {timingDraft.mode==='every'&&<>
            <label className="spm-sell-label"><span>Repeat</span><select className="spm-field" value={timingDraft.repeat}
              onChange={e=>setTimingDraft(t=>({...t,repeat:e.target.value as TimingDraft['repeat']}))}>
              <option value="week">Every week</option><option value="month">Every month</option></select></label>
            {timingDraft.repeat==='week'?
              <label className="spm-sell-label"><span>Day</span><select className="spm-field" value={timingDraft.weekday}
                onChange={e=>setTimingDraft(t=>({...t,weekday:e.target.value}))}>
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(x=><option key={x}>{x}</option>)}</select></label>:
              <label className="spm-sell-label"><span>Day of month</span><select className="spm-field" value={timingDraft.monthDay}
                onChange={e=>setTimingDraft(t=>({...t,monthDay:e.target.value}))}>
                {Array.from({length:31},(_,i)=>String(i+1)).concat('last').map(x=><option key={x} value={x}>{x}</option>)}</select></label>}
          </>}
          {timingDraft.mode==='after'&&<>
            {label('What must happen first?','sell-trigger',timingDraft.trigger,
              v=>setTimingDraft(t=>({...t,trigger:v})),'e.g. buyer inspection')}
            <label className="spm-sell-label"><span>Days after that event</span>
              <input type="number" className="spm-field" min="0" max="365" value={timingDraft.offsetDays}
                onChange={e=>setTimingDraft(t=>({...t,offsetDays:e.target.value}))}/></label>
          </>}
          <button className="spm-secondary spm-sell-wide" type="button" onClick={()=>{
            const prepared=buildTimingProposal(timingDraft);
            if(prepared.error){setError(prepared.error);return;}
            setTiming(prepared.text.split(' Ask me to review')[0]);setShelf(null);setError('');
            if(returningToReview){setStage('review');setReturningToReview(false);}
          }}><CalendarDays size={16}/>Add proposed timing</button>
          {timing&&<p className="spm-sell-hint">Current proposal: {timing}</p>}
        </>}
        {shelf==='people'&&<>
          <p className="spm-sell-hint">Add a buyer or agent to your draft. This does not invite anyone or confirm their consent.</p>
          <strong className="spm-sell-inline-question">Who should be involved?</strong>
          <div className="spm-sell-pill-row">
            <AnswerPill selected={personPlan==='later'} onClick={()=>{setPersonPlan('later');setShowPersonEntry(false);}}>Decide later</AnswerPill>
            <AnswerPill selected={personPlan==='securelink'} onClick={()=>{setPersonPlan('securelink');setShowPersonEntry(false);}}>Share with buyer later</AnswerPill>
            <AnswerPill selected={showPersonEntry} onClick={()=>{setShowPersonEntry(true);setPersonPlan(null);}}>Name someone</AnswerPill>
            <AnswerPill onClick={()=>setPeopleHint(show=>!show)}>My People</AnswerPill>
          </div>
          {peopleHint&&<p className="spm-sell-hint">Verified saved contacts aren't connected to this preview. Mini will offer a secure person picker when account-linked My People is ready; no contacts are fabricated.</p>}
          {showPersonEntry&&<>
            <strong className="spm-sell-inline-question">What is their role?</strong>
            <div className="spm-sell-pill-row">
              {['Buyer','Agent','Provider','Witness','Other'].map(role=>
                <AnswerPill key={role} selected={personRole===role} onClick={()=>setPersonRole(role)}>{role}</AnswerPill>)}
            </div>
            {label('Name or KS Number','sell-person',personName,setPersonName,'Name or KS Number, only if you choose',1)}
            <button className="spm-secondary spm-sell-wide" type="button" disabled={!personName.trim()} onClick={()=>{
              setPeople(p=>[...p,{name:personName.trim().slice(0,120),role:personRole}].slice(0,8));
              setPersonName('');setShowPersonEntry(false);
            }}><UserRoundPlus size={16}/>Add this person to the proposal</button>
          </>}
          {people.map((p,i)=><div className="spm-sell-data-row" key={i}><UserRoundPlus size={16}/>
            <span><strong>{p.name}</strong><small>{p.role} · not verified or invited</small></span>
            <button type="button" aria-label={'Remove '+p.name} onClick={()=>setPeople(x=>x.filter((_,j)=>i!==j))}><X size={17}/></button></div>)}
        </>}
        {returningToReview&&<button type="button" className="spm-secondary spm-sell-wide" onClick={()=>{
          setReturningToReview(false);setShelf(null);setStage('review');setError('');
        }}><CheckCircle2 size={16}/>Back to offer review</button>}
      </div>}
      </div>}
      {(!!descriptionReviewed||pictures.length>0||documents.length>0||!!place||!!timing||people.length>0)&&
        <div className="spm-sell-chips">
          {!!descriptionReviewed&&<span>Description ready</span>}
          {pictures.length>0&&<span>{pictures.length} photo(s)</span>}
          {documents.length>0&&<span>{documents.length} document(s)</span>}
          {!!place&&<span>{placeType} added</span>}
          {!!timing&&<span>Date & time added</span>}
          {people.length>0&&<span>{people.length} person(s)</span>}
        </div>}
      {!!error&&<p className="spm-error" role="alert">{error}</p>}
      <button type="button" className="spm-primary" onClick={reviewOffer}>Review my offer <ArrowRight size={18}/></button>
      <button type="button" className="spm-sell-sample" onClick={sample}>Try an example: 20 bags of feed</button>
      <div className="spm-sell-phase1-divider"><span>Or manage your trading</span></div>
      <button type="button" className="spm-sell-phase1-link spm-sell-phase1-store" onClick={onOpenStore} data-seller-phase1="my-store">
        <Store size={21}/><span><strong>My Store</strong><small>Offers, customer requests and your shopfront</small></span><ChevronRight size={18}/>
      </button>
      <button type="button" className="spm-sell-phase1-link" onClick={()=>setSellerArea('quick')} data-seller-phase1="quick-contract-entry">
        <Handshake size={20}/><span><strong>Quick Contract</strong><small>Trade again with someone you know</small></span><ChevronRight size={17}/>
      </button>
      <button type="button" className="spm-sell-phase1-link" onClick={()=>setSellerArea('relationships')} data-seller-phase1="relationships-entry">
        <Heart size={20}/><span><strong>My People & Favourite Stores</strong><small>Return to familiar trading relationships</small></span><ChevronRight size={17}/>
      </button>
      <button type="button" className="spm-sell-phase1-settings" onClick={onOpenSettings}>
        <Settings2 size={16}/>Store Settings <ChevronRight size={16}/>
      </button>
      <p className="spm-sell-hint">The Store and settings are fictional examples in this owner preview. Verified account, billing and permissions are not changed.</p>
    </>}
    {stage==='review'&&<>
      <h1 className="spm-question" data-mini-sell-review>Let's check your offer</h1>
      <p className="spm-lead">Make sure it is clear and yours to offer. The other person has not accepted anything yet.</p>
      <div className="spm-sell-review-card">
        {pictures[0]&&<div className="spm-sell-cover"><img src={pictures[0].preview} alt="Seller-provided offer"/>
          <span>Local photo · image registration pending</span></div>}
        <strong className="spm-sell-review-title">{title}</strong>
        <strong className="spm-sell-review-price">{prepared.ok?prepared.summary.moneyText:priceType==='fixed'?readableAmount(price):'Price to agree'}</strong>
        {quantity&&<small>Proposed quantity: {quantity} {unit} · not confirmed stock</small>}
        {prepared.ok&&prepared.summary.totalMinor!==null&&<div className="spm-sell-review-line">
          Proposed total: KSh {(prepared.summary.totalMinor/100).toLocaleString('en-KE',{maximumFractionDigits:2})} · {quantity} × listed unit price, not a final charge
        </div>}
        <p>{descriptionReviewed&&description?description:'A description can make this offer easier for buyers to understand. Add one with Describe & Present.'}</p>
        {!!place&&<div className="spm-sell-review-line"><MapPin size={15}/>{placeType}: {place}</div>}
        {!!timing&&<div className="spm-sell-review-line"><CalendarDays size={15}/>{timing}</div>}
        {people.map((p,i)=><div className="spm-sell-review-line" key={i}><UserRoundPlus size={15}/>{p.role}: {p.name} (not invited)</div>)}
        {personPlan&&<div className="spm-sell-review-line"><UserRoundPlus size={15}/>{personPlan==='later'?'Other person to be agreed':'Buyer to be invited after proposal review'}</div>}
        {documents.map((d,i)=><div className="spm-sell-review-line" key={i}><FileText size={15}/>{d.purpose}: {d.name} (not verified)</div>)}
      </div>
      {prepared.ok&&<details className="spm-sell-phase2-packet" data-mini-seller-offer-packet>
        <summary>What's included in this offer <ChevronRight size={15}/></summary>
        <div className="spm-sell-phase2-packet-content">
          <p><strong>Offer type</strong><span>{prepared.summary.kind==='PRODUCT'?'Goods':prepared.summary.kind==='SERVICE'?'Service':'Capacity'}</span></p>
          <p><strong>Pricing</strong><span>{prepared.summary.moneyText}</span></p>
          {prepared.summary.count!==null&&<p><strong>Proposed quantity</strong><span>{prepared.summary.count} {prepared.summary.priceUnit} · not stock confirmed</span></p>}
          <p><strong>Availability</strong><span>{stockStatement||'Needs seller confirmation'}</span></p>
          <p><strong>Description</strong><span>{prepared.summary.descriptionApproved?'Reviewed by you':'Not approved for Store use'}</span></p>
          {!!prepared.summary.placeLabel&&<p><strong>Place</strong><span>{prepared.summary.placeLabel} · proposed</span></p>}
          {!!prepared.summary.timing&&<p><strong>Calendar</strong><span>Proposed, not booked</span></p>}
          {!!prepared.summary.photos&&<p><strong>Photos</strong><span>{prepared.summary.photos} local · not uploaded</span></p>}
          {!!prepared.summary.documents&&<p><strong>Documents</strong><span>{prepared.summary.documents} filenames only · not checked</span></p>}
          {!!prepared.summary.persons&&<p><strong>People</strong><span>{prepared.summary.persons} named · nobody invited</span></p>}
          <p><strong>Store record</strong><span>Prepared only · not published</span></p>
        </div>
        <small>The shape matches SecurePay's existing Store offer fields. No Offer ID, version, verified availability or buyer consent has been issued.</small>
      </details>}
      <div className="spm-sell-check">
        <div className="spm-sell-check-head"><ShieldCheck size={18}/><strong>Quiet Fair Trade examination</strong></div>
        <p>One small question at a time. Tap an answer to continue; no forms to complete.</p>
        {currentQuestion==='photo'&&<section className="spm-sell-question" aria-label="Photograph source clarification" data-sell-question="photo">
          <span className="spm-sell-question-kicker">Just to clarify · {pendingPhotoIndex+1} of {pictures.length} photos</span>
          <strong>Where did this photograph come from?</strong>
          <p>{pictures[pendingPhotoIndex]?.name} · Your answer is a declaration, not proof of ownership.</p>
          <div className="spm-sell-pill-row">
            <AnswerPill onClick={()=>photoAnswered('own')}>I took it</AnswerPill>
            <AnswerPill onClick={()=>photoAnswered('supplier')}>Supplier's image</AnswerPill>
            <AnswerPill onClick={()=>photoAnswered('permission')}>I have permission</AnswerPill>
            <AnswerPill onClick={()=>setPhotoUncertain(true)}>Not sure</AnswerPill>
            <AnswerPill onClick={()=>setPictures(current=>current.filter((_,i)=>i!==pendingPhotoIndex))}>Remove photo</AnswerPill>
          </div>
          {photoUncertain&&<div className="spm-sell-clarification-help">
            <p>If you're unsure, ask the owner for permission or leave the photo out. That way you can continue without making an unsupported claim.</p>
            <button type="button" onClick={()=>openReviewTool('photos')}>Review photographs <ChevronRight size={15}/></button>
          </div>}
        </section>}
        {currentQuestion==='photo-permission'&&<section className="spm-sell-question" aria-label="Permission to reuse supplier photo" data-sell-question="photo-permission">
          <span className="spm-sell-question-kicker">One more thing about the photo</span>
          <strong>Has the supplier allowed you to use their image?</strong>
          <p>Knowing where a photograph came from is different from having permission to use it.</p>
          <div className="spm-sell-pill-row">
            <AnswerPill onClick={()=>{
              setPictures(current=>current.map((picture,i)=>i===pendingPhotoIndex?{...picture,supplierPermission:true}:picture));
              setPhotoUncertain(false);
            }}>Yes, I have permission</AnswerPill>
            <AnswerPill onClick={()=>setPhotoUncertain(true)}>Not sure</AnswerPill>
            <AnswerPill onClick={()=>setPictures(current=>current.filter((_,i)=>i!==pendingPhotoIndex))}>Remove photo</AnswerPill>
          </div>
          {photoUncertain&&<div className="spm-sell-clarification-help">
            <p>Ask the supplier or choose a photo you can use. Mini won't treat a supplier image as authorised just because you identified its source.</p>
            <button type="button" onClick={()=>openReviewTool('photos')}>Review photographs <ChevronRight size={15}/></button>
          </div>}
        </section>}
        {currentQuestion==='authority'&&<section className="spm-sell-question" aria-label="Authority to sell clarification" data-sell-question="authority">
          <span className="spm-sell-question-kicker">Next question</span>
          <strong>What gives you the right to offer this?</strong>
          <p>Tap only what is true for you. This records your declaration; SecurePay has not verified it.</p>
          <div className="spm-sell-pill-row">
            <AnswerPill onClick={()=>authorityAnswered('Owner')}>It's mine</AnswerPill>
            <AnswerPill onClick={()=>authorityAnswered('Authorised reseller')}>I'm an authorised reseller</AnswerPill>
            <AnswerPill onClick={()=>authorityAnswered('Agent with permission')}>I'm an authorised agent</AnswerPill>
            <AnswerPill onClick={()=>authorityAnswered('Supplier under an agreement')}>Supplier agreement</AnswerPill>
            <AnswerPill onClick={()=>setAuthorityUncertain(true)}>Not sure</AnswerPill>
          </div>
          {authorityUncertain&&<div className="spm-sell-clarification-help">
            <p>Keep this as a draft while you confirm permission. You can attach a supporting document for later review; a file alone does not prove authority.</p>
            <button type="button" onClick={()=>{setDocPurpose('Right to sell / authorisation');openReviewTool('documents');}}>Add a document <ChevronRight size={15}/></button>
          </div>}
        </section>}
        {currentQuestion==='availability'&&<section className="spm-sell-question" aria-label="Availability clarification" data-sell-question="availability">
          <span className="spm-sell-question-kicker">Next question</span>
          <strong>When could the buyer get this?</strong>
          <p>We won't say your stock has been verified. Select what you can genuinely offer.</p>
          <div className="spm-sell-pill-row">
            <AnswerPill onClick={()=>setStockStatement('Seller says available — not verified')}>Available now</AnswerPill>
            <AnswerPill onClick={()=>setStockStatement('Limited stock — buyer must confirm')}>Limited stock</AnswerPill>
            <AnswerPill onClick={()=>setStockStatement('Made or sourced after buyer’s order')}>Made to order</AnswerPill>
            <AnswerPill onClick={()=>setStockStatement('Service availability to be agreed')}>By appointment</AnswerPill>
            <AnswerPill onClick={()=>setStockStatement('Availability to be confirmed before agreement')}>Need to confirm</AnswerPill>
          </div>
        </section>}
        {currentQuestion==='safety'&&<section className="spm-sell-question" aria-label="Offer requiring specialist review" data-sell-question="safety">
          <strong>This offer needs further review.</strong>
          <p>Mini cannot clear a potentially restricted or unlawful offer from these answers. You may correct inaccurate wording or save your draft.</p>
          <div className="spm-sell-pill-row">
            <AnswerPill onClick={()=>openReviewTool('describe')}>Review item details</AnswerPill>
            <AnswerPill onClick={()=>finish('save')}>Save for later</AnswerPill>
          </div>
        </section>}
        {currentQuestion==='regulated'&&<section className="spm-sell-question" aria-label="Regulated offer clarification" data-sell-question="regulated">
          <strong>Does this item need special permission?</strong>
          <p>Some items need licences or eligibility checks. Attaching a document will not clear the restriction automatically in this preview.</p>
          <div className="spm-sell-pill-row">
            <AnswerPill onClick={()=>{setDocPurpose('Certificate / licence');openReviewTool('documents');}}>Add licence or document</AnswerPill>
            <AnswerPill onClick={()=>openReviewTool('describe')}>Check description</AnswerPill>
            <AnswerPill onClick={()=>finish('save')}>Save for later</AnswerPill>
          </div>
        </section>}
        {currentQuestion===null&&<section className="spm-sell-review-ready" role="status" data-sell-question="resolved">
          <CheckCircle2 size={17}/><span><strong>That's enough to prepare the offer.</strong>
          <small>Your answers are seller declarations, not verified clearance, availability or image ownership.</small></span>
        </section>}
        {remainingQuestions.length>0&&currentQuestion!=='safety'&&currentQuestion!=='regulated'&&
          <p className="spm-sell-question-count">{remainingQuestions.length} detail{remainingQuestions.length===1?'':'s'} still to clarify. Each answer moves to the next.</p>}
        {currentQuestion===null&&<div className="spm-sell-review-facts">
          <span>Right to offer: {rightType} · seller-declared</span>
          <span>Availability: {stockStatement}</span>
          {pictures.map((picture,i)=><span key={i}>{picture.name}: {photoSourceName(picture.source)} · unverified</span>)}
          <button type="button" onClick={()=>{setRightToOffer(false);setAuthorityUncertain(false);}}><Pencil size={13}/>Change right to sell</button>
          <button type="button" onClick={()=>setStockStatement('')}><Pencil size={13}/>Change availability</button>
          {pictures.length>0&&<button type="button" onClick={()=>openReviewTool('photos')}><Pencil size={13}/>Change photo details</button>}
        </div>}
        <p className="spm-sell-disclosure">Independent checks are still pending. A seller's answer does not verify lawfulness, identity, stock, copyright or a document.</p>
        <details data-mini-sell-trust-examination className="spm-sell-phase3-details">
          <summary>What did Mini look at? <ChevronRight size={15}/></summary>
          <div className="spm-sell-phase3-checks">
            {trust.checks.map(item=><div className="spm-sell-phase3-check" key={item.key}>
              <strong>{item.title}</strong>
              <span>{item.status==='NEEDS_SELLER_ANSWER'?'Answer needed':
                item.status==='NEEDS_SPECIALIST_REVIEW'?'Specialist review needed':
                item.status==='SELLER_DECLARED'?'Seller statement':
                item.status==='PERMISSION_DECLARED_UNVERIFIED'?'Permission stated · unverified':
                item.status==='SELLER_REVIEWED'?'Seller reviewed':
                item.status==='NOT_APPLICABLE'?'Not needed':
                item.status==='LOCAL_REFERENCE_ONLY'?'Not uploaded':
                item.status==='OPTIONAL_IMPROVEMENT'?'Optional':'Not independently checked'}</span>
              <small>{item.detail}</small>
            </div>)}
            <p>No real Identimark has been registered. The backend source-ingestion service supports server-checked file signatures and an exact SHA-256 digest, but is not yet connected to this seller review or authorized Store image use.</p>
          </div>
        </details>
        {exampleReviewerQuestion&&<details className="spm-sell-phase3-details" data-mini-seller-review-example>
          <summary>If we need one more detail <ChevronRight size={15}/></summary>
          <div className="spm-sell-clarification-help">
            <small>Example question only — no reviewer has examined this draft.</small>
            <strong>{exampleReviewerQuestion.question}</strong>
            <p>{exampleReviewerQuestion.detail}</p>
            <div className="spm-sell-pill-row">
              {exampleReviewerQuestion.pills.map(pill=><AnswerPill key={pill.id} onClick={()=>{
                if(pill.id==='documents'){setDocPurpose('Photo use permission');openReviewTool('documents');}
                else if(pill.id==='photos')openReviewTool('photos');
                else if(pill.id==='describe')openReviewTool('describe');
                else if(pill.id==='submitted'){
                  openReviewTool('documents');
                  setError('A real Store must receive and check new evidence before requesting another review. This preview has not uploaded any document.');
                }else if(pill.id==='save')finish('save');
                else if(pill.id==='remove')setPictures(previous=>previous.slice(1));
                else if(pill.id==='help')setKsHelp(true);
              }}>{pill.label}</AnswerPill>)}
            </div>
            <p>No real reviewer response, approval, Identimark or public Store image is created by these example answers.</p>
          </div>
        </details>}
      </div>
      {currentQuestion===null&&<div className="spm-sell-review-enrich" data-sell-additions>
        <strong>Anything else that would help the buyer?</strong>
        <p>Optional. Choose what matters, or continue straight to the offer.</p>
        <div className="spm-sell-pill-row">
          {!timing&&<AnswerPill onClick={()=>openReviewTool('timing')}><CalendarDays size={15}/>Choose a date</AnswerPill>}
          {!people.length&&<AnswerPill onClick={()=>openReviewTool('people')}><UserRoundPlus size={15}/>Add a person</AnswerPill>}
          {!place&&<AnswerPill onClick={()=>openReviewTool('places')}><MapPin size={15}/>Pickup or delivery</AnswerPill>}
          <AnswerPill onClick={()=>setShowMorePills(open=>!open)}>{showMorePills?'Fewer options':'More options'} <ChevronRight size={14}/></AnswerPill>
        </div>
        {showMorePills&&<div className="spm-sell-pill-row" data-sell-more-options>
          <AnswerPill onClick={()=>openReviewTool('photos')}><Camera size={15}/>Photos</AnswerPill>
          <AnswerPill onClick={()=>openReviewTool('documents')}><FileText size={15}/>Supporting documents</AnswerPill>
          <AnswerPill onClick={()=>openReviewTool('describe')}><BookOpenText size={15}/>Improve description</AnswerPill>
          <AnswerPill onClick={()=>openReviewTool('timing')}>Repeat or after an event</AnswerPill>
          <AnswerPill onClick={()=>openReviewTool('people')}>Other people or roles</AnswerPill>
        </div>}
      </div>}
      <div className="spm-sell-action-header"><strong>What would you like to do?</strong><small>Three independent choices</small></div>
      <div className="spm-sell-exits">
        <button type="button" onClick={()=>finish('share')} disabled={!canOffer}>
          <span><Send size={19}/></span><span><strong>Share with buyer</strong><small>SecureLink review or show the proposal directly. No payment request.</small></span><ChevronRight size={17}/></button>
        <button type="button" onClick={()=>finish('store')} disabled={!canOffer}>
          <span><Store size={19}/></span><span><strong>Add to my store</strong><small>Prepare a listing. Publishing requires real store authority and checks.</small></span><ChevronRight size={17}/></button>
        <button type="button" onClick={()=>finish('save')}>
          <span><Bookmark size={19}/></span><span><strong>Save for later</strong><small>Keep seller-written text in this tab; attachments, people and private meeting details won't be saved.</small></span><ChevronRight size={17}/></button>
      </div>
      {canOffer&&prepared.ok&&<MiniSellerSaveTemplate
        key={offerSignature} gateway={memoryGateway}
        title={title} terms={descriptionReviewed?description:''}/>}
      {!canOffer&&<p className="spm-sell-hint">Sharing and store publishing remain unavailable until the concerns above are resolved. You can always save a draft.</p>}
      <button type="button" className="spm-quiet-button" onClick={()=>{setKsHelp(x=>!x);}}><MessageCircle size={16}/>How can KS001 help?</button>
      {ksHelp&&<p className="spm-sell-hint">KS001 can later help interpret documents, clarify seller rights and improve the offer. It has not examined or verified this sample yet.</p>}
    </>}
    {stage==='result'&&<>
      <span className="spm-sell-done-icon"><CheckCircle2 size={27}/></span>
      <h1 className="spm-question">{result==='save'?'Draft kept on this device':result==='share'?'Ready for buyer review':'Store listing preview'}</h1>
      <p className="spm-lead">{result==='save'
        ? 'Only your written offer details were kept in this browser tab when storage was available. Photos, document files, people and private directions were not saved or uploaded.'
        : result==='share'
        ? (shareIssued?'A SecureLink was issued from your actual Agreement. Opening it does not accept, join or pay.':'This is the buyer-facing proposal. No real SecureLink or invitation has been created, and nobody has accepted it.')
        : 'This is how the seller’s offer could appear in a Store. Nothing has been published or registered.'}</p>
      <div className="spm-sell-review-card">
        <strong className="spm-sell-review-title">{title}</strong>
        <strong className="spm-sell-review-price">{prepared.ok?prepared.summary.moneyText:priceType==='fixed'?readableAmount(price):'Price to agree'}</strong>
        {prepared.ok&&prepared.summary.count!==null&&<small>Proposed quantity: {prepared.summary.count} {prepared.summary.priceUnit}</small>}
        <p>{descriptionReviewed&&description?description:'Seller-provided details will appear here after review.'}</p>
        {prepared.ok&&prepared.summary.totalMinor!==null&&<div className="spm-sell-review-line">Proposed total: KSh {(prepared.summary.totalMinor/100).toLocaleString('en-KE',{maximumFractionDigits:2})}, not an invoice or approved payment</div>}
        {prepared.ok&&<small>{realDraftAgreement
          ? 'Saved Agreement in SecurePay · not accepted or funded'
          : 'Prepared for discussion · no real Store publication, invitation or Agreement'}</small>}
        {!!place&&<div className="spm-sell-review-line"><MapPin size={15}/>{placeType}: {place}</div>}
        {!!timing&&<div className="spm-sell-review-line"><CalendarDays size={15}/>{timing}</div>}
        {personPlan&&<div className="spm-sell-review-line"><UserRoundPlus size={15}/>{personPlan==='later'?'Other person to be agreed':'Buyer to be invited later'}</div>}
      </div>
      {result==='share'&&previewSecureLinkJourney&&!agreementGateway&&!handoffGateway&&prepared.ok&&
        <MiniSellSecureLinkWalkthrough
          key={offerSignature}
          title={title}
          description={descriptionReviewed?description:''}
          moneyText={prepared.summary.moneyText}
          place={place}
          timing={timing}
          onChangeOffer={()=>{setStage('review');setResult(null);}}
        />}
      {result==='share'&&sellerContext?.type==='business'&&!onPrepareInKs001&&
        <p className="spm-sell-hint">To share as this Business, open KS001 to confirm who may represent it in the Agreement. This offer has not been sent.</p>}
      {result==='share'&&handoffGateway&&agreementGateway&&prepared.ok&&canOffer&&(onPrepareInKs001||linkedKs001Source)&&<>
        <div className="spm-sell-review-card">
          <strong>Prepare the Agreement</strong>
          {onPrepareInKs001&&(!linkedKs001Source||!sourceMatchesOffer)&&
            <button type="button" className="spm-secondary spm-sell-wide"
              disabled={sourceSaving||handoffBusy} onClick={prepareOfferInKs001}>
              <MessageCircle size={16}/>{sourceSaving?'Preparing…':'Prepare these terms in KS001'}
            </button>}
          {!sourceMatchesOffer&&linkedKs001Source&&
            <p className="spm-sell-hint">Your offer changed. Ask KS001 to review the new terms first.</p>}
          {!serverReview&&!realDraftAgreement&&linkedKs001Source&&sourceMatchesOffer&&<button type="button"
            className="spm-secondary spm-sell-wide"
            disabled={handoffBusy}
            onClick={reviewSavedOfferInSecurePay}>
            <BookOpenText size={16}/>{handoffBusy?'Checking…':'Review saved KS001 terms'}
          </button>}
          {serverReview&&<>
            <p className="spm-sell-hint">Review the terms recorded in SecurePay, not just this local offer preview.</p>
            <strong>{serverReview.candidate.title||'Agreement to be named'}</strong>
            <p>{serverReview.candidate.description||serverReview.candidate.purpose||'No further description recorded.'}</p>
            {serverReview.candidate.amountMinor!=null&&<p>Proposed amount: {serverReview.candidate.currency||'KES'} {(serverReview.candidate.amountMinor/100).toLocaleString('en-KE',{maximumFractionDigits:2})}</p>}
            {serverReview.candidate.what?.slice(0,4).map((item,i)=><small key={'what-'+i}>What: {item}</small>)}
            {serverReview.candidate.who?.slice(0,4).map((item,i)=><small key={'who-'+i}>Who: {item}</small>)}
            {serverReview.candidate.when?.slice(0,4).map((item,i)=><small key={'when-'+i}>When: {item}</small>)}
            {serverReview.stillToDecide.length>0&&<p className="spm-sell-hint">Still to decide: {serverReview.stillToDecide.map(x=>x.description).join('; ')}</p>}
            {serverReview.mustResolve.length>0&&<p className="spm-sell-hint">Needs clarification: {serverReview.mustResolve.map(x=>x.description).join('; ')}</p>}
            {!unchangedAfterReview&&<p className="spm-sell-hint">Your offer has changed since this review. Review the current version again.</p>}
            {serverReview.canProgress&&unchangedAfterReview&&!realDraftAgreement&&<>
              <div className="spm-sell-pill-row">
                <AnswerPill selected={reviewAcknowledged}
                  onClick={()=>setReviewAcknowledged(true)}>These are the terms I'll share</AnswerPill>
                <AnswerPill onClick={()=>{setReviewAcknowledged(false);
                  setHandoffMessage('Make the change in KS001, then review the new version.');}}>I need to change something</AnswerPill>
              </div>
              <button type="button" className="spm-secondary spm-sell-wide"
                disabled={!reviewAcknowledged||handoffBusy} onClick={setUpReviewedAgreement}>
                <FileText size={16}/>{handoffBusy?'Preparing…':'Set up my draft Agreement'}
              </button>
            </>}
          </>}
          {realDraftAgreement&&!proposedAgreement&&<button type="button"
            className="spm-secondary spm-sell-wide" disabled={handoffBusy||!unchangedAfterReview}
            onClick={proposeReviewedAgreement}>
            <Handshake size={16}/>{handoffBusy?'Checking…':'Propose Agreement for buyer review'}
          </button>}
          {handoffMessage&&<p className="spm-sell-hint" role="status">{handoffMessage}</p>}
        </div>
      </>}
      {result==='share'&&agreementGateway&&proposedAgreement&&unchangedAfterReview&&prepared.ok&&canOffer&&<>
        <button type="button" className="spm-secondary spm-sell-wide"
          disabled={shareCreating||shareIssued} onClick={issueSecureLink}>
          <Send size={16}/>{shareIssued?'SecureLink issued':shareCreating?'Preparing…':'Create SecureLink'}
        </button>
        {shareUrl&&<MiniSellerShareOptions publicUrl={shareUrl} title={title}/>} 
        {shareStatus&&<p className="spm-sell-hint" role="status">{shareStatus}</p>}
      </>}
      {result==='store'&&storeGateway&&sellerContext&&prepared.ok&&<>
        <p className="spm-sell-hint">Want to save this to your actual Store? It will stay private, with no photos or confirmed stock.</p>
        <button type="button" className="spm-secondary spm-sell-wide"
          disabled={storeCreating||!!canonicalOfferId} onClick={createRealStoreDraft}>
          <Store size={16}/>{canonicalOfferId?'Private Store draft saved':storeCreating?'Saving…':'Save private Store draft'}
        </button>
        {canonicalOfferId&&savedStoreRevision&&!storePublished&&<>
          <p className="spm-sell-hint">Would you like to make the written listing visible now? No photos or claimed stock numbers will be published.</p>
          <div className="spm-sell-pill-row">
            <AnswerPill onClick={()=>setCanonicalStoreStatus('Your offer stays private in My Store.')}>Keep private</AnswerPill>
            <AnswerPill onClick={()=>void publishRealStoreText()}
              disabled={storePublishing||storeSnapshotSignature!==offerSignature}>
              {storePublishing?'Publishing…':'Publish text only'}</AnswerPill>
          </div>
          {storeSnapshotSignature!==offerSignature&&
            <p className="spm-sell-hint">You changed the offer after saving it. Review the new version in My Store first.</p>}
        </>}
        {canonicalStoreStatus&&<p className="spm-sell-hint" role="status">{canonicalStoreStatus}</p>}
      </>}
      <button type="button" className="spm-primary" onClick={()=>{setStage('review');setResult(null);}}>Back to offer <ArrowRight size={17}/></button>
      <button type="button" className="spm-sell-sample" onClick={onBack}>Back to Mini</button>
    </>}
  </section>;
}
