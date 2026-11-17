import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, BookOpenText, CalendarDays, Camera, CheckCircle2,
  ChevronRight, FileText, MapPin, MessageCircle, Pencil, Send, ShieldCheck,
  Store, UserRoundPlus, Heart, Handshake, Settings2, ShoppingBag, UsersRound, X
} from 'lucide-react';
import { buildTimingProposal, type TimingDraft } from '../features/living-workspace/DateTimeTool';
import type { MiniLanguage } from './miniModel';
import {miniSellerPreparedOffer,miniSellerSafeDraft,miniSellerRestoreDraft} from './miniSellerPreparedOffer.mjs';
import {miniSellerTrustExamination} from './miniSellerTrustExamination.mjs';

type Shelf = 'describe'|'photos'|'documents'|'places'|'timing'|'people'|null;
type PhotoSource = 'own'|'supplier'|'permission'|'unknown';
type Picture = { name:string; preview:string; source:PhotoSource; supplierPermission?:boolean };
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
export function MiniSellSomething({language,onBack,onOpenStore,onOpenSettings,onBrowseStores,actingAs,seed=''}:{
  language:MiniLanguage;onBack:()=>void;onOpenStore:()=>void;onOpenSettings:()=>void;
  onBrowseStores:()=>void;actingAs:string;seed?:string;
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
  const [ksHelp,setKsHelp]=useState(false);
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
  const choosePhoto=(file?:File)=>{
    if(!file)return;
    setError('');
    if(!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024||file.size===0) {
      setError('Choose a JPG or PNG photo up to 5 MB. Nothing was uploaded.');return;
    }
    if(pictures.length>=4){setError('You can add up to four photographs in this first preview.');return;}
    const reader=new FileReader();
    reader.onload=()=>{
      if(typeof reader.result!=='string')return;
      setPictures(current=>[...current,{name:file.name.slice(0,100),preview:reader.result as string,source:'unknown' as PhotoSource,supplierPermission:false}].slice(0,4));
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
    <div className="spm-persona"><ShieldCheck size={15}/><span>Sell something</span><span className="spm-dot"/><span>Owner preview</span></div>
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
      <p className="spm-sell-hint">Trade-again shortcuts and saved contract templates will connect in Phase 6. No SecureLink, Agreement or payment is created here.</p>
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
      <p className="spm-sell-hint">Private, account-linked favourites and Trade again belong to Phase 6. No contacts are copied from your device.</p>
    </div>}
    {stage==='compose'&&sellerArea==='offer'&&<>
      <div className="spm-sell-phase1-capacity"><span>Acting as <strong>{actingAs}</strong></span><small>Example only · authority not verified</small></div>
      <h1 className="spm-question">{sw?'Unauza nini?':'What are you selling?'}</h1>
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
          <input ref={photoRef} className="spm-file-hidden" type="file" accept="image/jpeg,image/png" onChange={e=>{choosePhoto(e.target.files?.[0]);e.target.value='';}}/>
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
        ? 'This is the buyer-facing proposal. No real SecureLink or invitation has been created, and nobody has accepted it.'
        : 'This is how the seller’s offer could appear in a Store. Nothing has been published or registered.'}</p>
      <div className="spm-sell-review-card">
        <strong className="spm-sell-review-title">{title}</strong>
        <strong className="spm-sell-review-price">{prepared.ok?prepared.summary.moneyText:priceType==='fixed'?readableAmount(price):'Price to agree'}</strong>
        {prepared.ok&&prepared.summary.count!==null&&<small>Proposed quantity: {prepared.summary.count} {prepared.summary.priceUnit}</small>}
        <p>{descriptionReviewed&&description?description:'Seller-provided details will appear here after review.'}</p>
        {prepared.ok&&prepared.summary.totalMinor!==null&&<div className="spm-sell-review-line">Proposed total: KSh {(prepared.summary.totalMinor/100).toLocaleString('en-KE',{maximumFractionDigits:2})}, not an invoice or approved payment</div>}
        {prepared.ok&&<small>Prepared for discussion · no real Store publication, invitation or Agreement</small>}
        {!!place&&<div className="spm-sell-review-line"><MapPin size={15}/>{placeType}: {place}</div>}
        {!!timing&&<div className="spm-sell-review-line"><CalendarDays size={15}/>{timing}</div>}
        {personPlan&&<div className="spm-sell-review-line"><UserRoundPlus size={15}/>{personPlan==='later'?'Other person to be agreed':'Buyer to be invited later'}</div>}
      </div>
      <button type="button" className="spm-primary" onClick={()=>{setStage('review');setResult(null);}}>Back to offer <ArrowRight size={17}/></button>
      <button type="button" className="spm-sell-sample" onClick={onBack}>Back to Mini</button>
    </>}
  </section>;
}
