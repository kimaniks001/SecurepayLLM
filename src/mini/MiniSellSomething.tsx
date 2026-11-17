import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, BookOpenText, CalendarDays, Camera, CheckCircle2,
  ChevronRight, FileText, MapPin, MessageCircle, Send, ShieldCheck,
  Store, UserRoundPlus, X
} from 'lucide-react';
import { buildTimingProposal, type TimingDraft } from '../features/living-workspace/DateTimeTool';
import type { MiniLanguage } from './miniModel';

type Shelf = 'describe'|'photos'|'documents'|'places'|'timing'|'people'|null;
type PhotoSource = 'own'|'supplier'|'permission'|'unknown';
type Picture = { name:string; preview:string; source:PhotoSource };
type Support = { name:string; purpose:string };
type Person = { name:string; role:string };
type Result = 'share'|'store'|'save'|null;
type Category = 'Goods'|'Agriculture'|'Equipment'|'Furniture'|'Services';

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
export function MiniSellSomething({language,onBack,seed=''}:{
  language:MiniLanguage;onBack:()=>void;seed?:string;
}) {
  const sw=language==='sw';
  const [stage,setStage]=useState<'compose'|'review'|'result'>('compose');
  const [shelf,setShelf]=useState<Shelf>(null);
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
  const [rightToOffer,setRightToOffer]=useState(false);
  const [rightType,setRightType]=useState('Owner');
  const [stockStatement,setStockStatement]=useState('');
  const [error,setError]=useState('');
  const [result,setResult]=useState<Result>(null);
  const [ksHelp,setKsHelp]=useState(false);
  const photoRef=useRef<HTMLInputElement>(null);
  const docRef=useRef<HTMLInputElement>(null);
  const [photoCount,setPhotoCount]=useState(0);
  const invalidPrice=priceType==='fixed' && !readableAmount(price);
  const suspicious=useMemo(()=>/\b(?:stolen|counterfeit|fake passport|ivory|illegal drugs|firearms?|ammunition)\b/i.test(title+' '+description),[title,description]);
  const sensitive=useMemo(()=>/\b(?:medicine|pharmaceutical|pesticide|alcohol|vehicle registration)\b/i.test(title+' '+description),[title,description]);
  const imageNeedsSource=pictures.some(p=>p.source==='unknown');
  const canOffer=!!title.trim()&&!invalidPrice&&!suspicious&&!sensitive&&rightToOffer&&!imageNeedsSource;
  const refreshDescription=()=>{setDescriptionReviewed(false);setError('');};
  const fields = {title,category,condition,specifications,purpose,included,limitations,warranty};
  const evidenceNotices=[
    !rightToOffer?'Confirm your authority to offer this item.':null,
    imageNeedsSource?'Tell us where each photograph came from.':null,
    suspicious?'This offer needs specialist review; it cannot be shared or listed in this preview.':null,
    sensitive?'This category needs applicable licensing and eligibility checks before publication.':null,
    !stockStatement.trim()?'Availability has not been checked. Buyers should know this.':null
  ].filter((line):line is string=>line!==null);
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
      setPictures(current=>[...current,{name:file.name.slice(0,100),preview:reader.result as string,source:'unknown' as PhotoSource}].slice(0,4));
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
    if(quantity.trim()&&(!/^\d+(?:\.\d{1,3})?$/.test(quantity)||Number(quantity)<=0)){
      setError('Please check the quantity.');return;
    }
    setShelf(null);setStage('review');
  };
  const finish=(kind:Result)=>{
    if(kind!=='save'&&!canOffer)return;
    if(kind==='save'){
      try{sessionStorage.setItem('securepay-mini-sell-preview-draft-v1',JSON.stringify({
        title,category,priceType,price,quantity,unit,description,placeType,place,timing,stockStatement
      }));}catch{/* Browsers may refuse optional local storage. */}
    }
    setResult(kind);setStage('result');
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
    setError('');setShelf('describe');
  };
  const label=(text:string,id:string,value:string,set:(v:string)=>void,placeholder:string,rows=0)=>
    <label className="spm-sell-label" htmlFor={id}><span>{text}</span>
      {rows? <textarea id={id} className="spm-field" rows={rows} value={value}
        placeholder={placeholder} maxLength={800} onChange={e=>set(e.target.value)}/> :
        <input id={id} className="spm-field" type="text" value={value}
          placeholder={placeholder} maxLength={300} onChange={e=>set(e.target.value)}/>}
    </label>;
  return <section className="spm-content spm-sell" data-mini-sell-something="preview">
    <button type="button" className="spm-back" onClick={stage==='compose'?onBack:()=>{setStage(stage==='result'?'review':'compose');setError('');}}>
      <ArrowLeft size={18}/>{stage==='compose'?'Mini':stage==='result'?'Offer review':'Change offer'}</button>
    <div className="spm-persona"><ShieldCheck size={15}/><span>Sell something</span><span className="spm-dot"/><span>Owner preview</span></div>
    {stage==='compose'&&<>
      <h1 className="spm-question">{sw?'Unauza nini?':'What are you selling?'}</h1>
      <p className="spm-lead">Tell Mini a little. Add pictures or details only when they help you make a better offer.</p>
      {label('Your item or service','sell-title',title,v=>{setTitle(v);refreshDescription();},'e.g. 20 bags of animal feed',2)}
      <div className="spm-sell-grid2">
        <label className="spm-sell-label"><span>Pricing</span><select className="spm-field" value={priceType} onChange={e=>setPriceType(e.target.value as 'fixed'|'quote')}><option value="fixed">Fixed price</option><option value="quote">Price to agree</option></select></label>
        {priceType==='fixed'&&label('Price in KSh','sell-price',price,setPrice,'2,500')}
      </div>
      <div className="spm-sell-grid2">
        {label('Quantity (optional)','sell-quantity',quantity,setQuantity,'20')}
        {label('Unit (optional)','sell-unit',unit,setUnit,'bags, kg, hours')}
      </div>
      <div className="spm-sell-small-head"><strong>Help prepare your offer</strong><span>Choose what you need</span></div>
      <div className="spm-sell-tool-grid">{toolList.map(({id,label:toolLabel,icon:Icon})=>
        <button type="button" className={'spm-sell-tool'+(shelf===id?' active':'')} aria-expanded={shelf===id}
          key={id} onClick={()=>{setShelf(shelf===id?null:id);setError('');}}>
          <Icon size={18}/><span>{toolLabel}</span>
          {(id==='photos'&&pictures.length>0||id==='documents'&&documents.length>0||
            id==='people'&&people.length>0||id==='timing'&&!!timing||id==='places'&&!!place||
            id==='describe'&&!!descriptionReviewed)&&<CheckCircle2 size={13}/>}
        </button>)}</div>
      {shelf&&<div className="spm-sell-tool-panel" aria-label={toolList.find(t=>t.id===shelf)?.label}>
        <div className="spm-sell-panel-head"><strong>{toolList.find(t=>t.id===shelf)?.label}</strong>
          <button type="button" aria-label="Close tool" onClick={()=>setShelf(null)}><X size={17}/></button></div>
        {shelf==='describe'&&<>
          <p className="spm-sell-hint">A good description helps buyers understand the offer. Only details you supply will appear.</p>
          <label className="spm-sell-label"><span>What kind of offer?</span><select className="spm-field" value={category} onChange={e=>{setCategory(e.target.value as Category);refreshDescription();}}>
            {(['Goods','Agriculture','Equipment','Furniture','Services'] as const).map(c=><option key={c}>{c}</option>)}</select></label>
          {category!=='Services'&&label('Condition','sell-condition',condition,v=>{setCondition(v);refreshDescription();},'New, used, refurbished…')}
          {label(category==='Agriculture'?'Weight, grade, ingredients or variety':category==='Equipment'?'Model, capacity and specifications':category==='Furniture'?'Material and dimensions':category==='Services'?'Scope and deliverables':'Specifications or features',
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
              <label className="spm-sell-label"><span>Where did this photo come from?</span>
                <select value={p.source} className="spm-field" onChange={e=>setPictures(prev=>prev.map((x,j)=>j===i?{...x,source:e.target.value as PhotoSource}:x))}>
                  <option value="unknown">Choose its source</option><option value="own">I took it</option>
                  <option value="supplier">Authorized supplier image</option><option value="permission">I have permission</option>
                </select></label>
              <button className="spm-sell-text-button" type="button" onClick={()=>setPictures(prev=>prev.filter((_,j)=>j!==i))}>Remove</button>
            </div></div>)}
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
          <label className="spm-sell-label"><span>Place purpose</span><select className="spm-field" value={placeType} onChange={e=>setPlaceType(e.target.value as typeof placeType)}>
            <option>Pickup</option><option>Delivery</option><option>Work location</option></select></label>
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
          <label className="spm-sell-label"><span>Timing arrangement</span><select className="spm-field" value={timingDraft.mode}
            onChange={e=>setTimingDraft(t=>({...t,mode:e.target.value as TimingDraft['mode']}))}>
            <option value="on">On a date</option><option value="between">Between dates</option>
            <option value="every">Repeating</option><option value="after">After an event</option>
          </select></label>
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
          }}><CalendarDays size={16}/>Add proposed timing</button>
          {timing&&<p className="spm-sell-hint">Current proposal: {timing}</p>}
        </>}
        {shelf==='people'&&<>
          <p className="spm-sell-hint">Add a buyer or agent to your draft. This does not invite anyone or confirm their consent.</p>
          {label('Name or KS Number','sell-person',personName,setPersonName,'e.g. Kamau, or KS Number')}
          <label className="spm-sell-label"><span>Role</span><select className="spm-field" value={personRole} onChange={e=>setPersonRole(e.target.value)}>
            {['Buyer','Agent','Provider','Witness','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
          <button className="spm-secondary spm-sell-wide" type="button" disabled={!personName.trim()} onClick={()=>{
            setPeople(p=>[...p,{name:personName.trim().slice(0,120),role:personRole}].slice(0,8));setPersonName('');
          }}><UserRoundPlus size={16}/>Add proposed person</button>
          {people.map((p,i)=><div className="spm-sell-data-row" key={i}><UserRoundPlus size={16}/>
            <span><strong>{p.name}</strong><small>{p.role} · not verified or invited</small></span>
            <button type="button" aria-label={'Remove '+p.name} onClick={()=>setPeople(x=>x.filter((_,j)=>i!==j))}><X size={17}/></button></div>)}
        </>}
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
    </>}
    {stage==='review'&&<>
      <h1 className="spm-question">Let's check your offer</h1>
      <p className="spm-lead">Make sure it is clear and yours to offer. The other person has not accepted anything yet.</p>
      <div className="spm-sell-review-card">
        {pictures[0]&&<div className="spm-sell-cover"><img src={pictures[0].preview} alt="Seller-provided offer"/>
          <span>SecurePay Identimark · preview only</span></div>}
        <strong className="spm-sell-review-title">{title}</strong>
        <strong className="spm-sell-review-price">{priceType==='fixed'?readableAmount(price):'Price to agree'}</strong>
        {quantity&&<small>{quantity} {unit}</small>}
        <p>{descriptionReviewed&&description?description:'A description can make this offer easier for buyers to understand. Add one with Describe & Present.'}</p>
        {!!place&&<div className="spm-sell-review-line"><MapPin size={15}/>{placeType}: {place}</div>}
        {!!timing&&<div className="spm-sell-review-line"><CalendarDays size={15}/>{timing}</div>}
        {people.map((p,i)=><div className="spm-sell-review-line" key={i}><UserRoundPlus size={15}/>{p.role}: {p.name} (not invited)</div>)}
        {documents.map((d,i)=><div className="spm-sell-review-line" key={i}><FileText size={15}/>{d.purpose}: {d.name} (not verified)</div>)}
      </div>
      <div className="spm-sell-check">
        <div className="spm-sell-check-head"><ShieldCheck size={18}/><strong>Quiet Fair Trade examination</strong></div>
        <p>We ask what matters before you share. This preview does not make legal, stock or identity decisions.</p>
        <label className="spm-sell-label"><span>My authority to sell</span>
          <select value={rightType} className="spm-field" onChange={e=>{setRightType(e.target.value);setRightToOffer(false);}}>
            <option>Owner</option><option>Authorised reseller</option><option>Agent with permission</option><option>Supplier under an agreement</option>
          </select></label>
        <label className="spm-sell-checkline"><input type="checkbox" checked={rightToOffer} onChange={e=>setRightToOffer(e.target.checked)}/>
          <span>I declare I have the right to make this offer as {rightType.toLowerCase()}.</span></label>
        <label className="spm-sell-label"><span>What can you say about availability?</span>
          <select className="spm-field" value={stockStatement} onChange={e=>setStockStatement(e.target.value)}>
            <option value="">Not yet checked</option><option>Seller says available — not verified</option>
            <option>Made or sourced after buyer's order</option><option>Limited stock — buyer must confirm</option>
            <option>Service availability to be agreed</option>
          </select></label>
        {evidenceNotices.length>0&&<div className="spm-sell-concerns">{evidenceNotices.map((x,i)=><p key={i}>{x}</p>)}</div>}
        <p className="spm-sell-disclosure">Image fingerprinting, legality, licensing, ownership, document validity and inventory checks require server services that are not connected in this preview.</p>
      </div>
      <div className="spm-sell-action-header"><strong>What would you like to do?</strong><small>Three independent choices</small></div>
      <div className="spm-sell-exits">
        <button type="button" onClick={()=>finish('share')} disabled={!canOffer}>
          <span><Send size={19}/></span><span><strong>Share with buyer</strong><small>SecureLink review or show the proposal directly. No payment request.</small></span><ChevronRight size={17}/></button>
        <button type="button" onClick={()=>finish('store')} disabled={!canOffer}>
          <span><Store size={19}/></span><span><strong>Add to my store</strong><small>Prepare a listing. Publishing requires real store authority and checks.</small></span><ChevronRight size={17}/></button>
        <button type="button" onClick={()=>finish('save')}>
          <span><Bookmark size={19}/></span><span><strong>Save for later</strong><small>Keep the text of this draft in this browser tab.</small></span><ChevronRight size={17}/></button>
      </div>
      {!canOffer&&<p className="spm-sell-hint">Sharing and store publishing remain unavailable until the concerns above are resolved. You can always save a draft.</p>}
      <button type="button" className="spm-quiet-button" onClick={()=>{setKsHelp(x=>!x);}}><MessageCircle size={16}/>How can KS001 help?</button>
      {ksHelp&&<p className="spm-sell-hint">KS001 can later help interpret documents, clarify seller rights and improve the offer. It has not examined or verified this sample yet.</p>}
    </>}
    {stage==='result'&&<>
      <span className="spm-sell-done-icon"><CheckCircle2 size={27}/></span>
      <h1 className="spm-question">{result==='save'?'Draft kept on this device':result==='share'?'Ready for buyer review':'Store listing preview'}</h1>
      <p className="spm-lead">{result==='save'
        ? 'Your written terms were kept in this browser tab when storage was available. Photos and documents are not saved or uploaded.'
        : result==='share'
        ? 'This is the buyer-facing proposal. No real SecureLink or invitation has been created, and nobody has accepted it.'
        : 'This is how the seller’s offer could appear in a Store. Nothing has been published or registered.'}</p>
      <div className="spm-sell-review-card">
        <strong className="spm-sell-review-title">{title}</strong>
        <strong className="spm-sell-review-price">{priceType==='fixed'?readableAmount(price):'Price to agree'}</strong>
        <p>{descriptionReviewed&&description?description:'Seller-provided details will appear here after review.'}</p>
        {!!place&&<div className="spm-sell-review-line"><MapPin size={15}/>{placeType}: {place}</div>}
        {!!timing&&<div className="spm-sell-review-line"><CalendarDays size={15}/>{timing}</div>}
      </div>
      <button type="button" className="spm-primary" onClick={()=>{setStage('review');setResult(null);}}>Back to offer <ArrowRight size={17}/></button>
      <button type="button" className="spm-sell-sample" onClick={onBack}>Back to Mini</button>
    </>}
  </section>;
}
