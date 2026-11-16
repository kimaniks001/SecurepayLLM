import {useState, type Dispatch, type SetStateAction, type ReactNode} from 'react';
import {
  ArrowLeft,ArrowRight,BookOpenText,BriefcaseBusiness,Check,ChevronRight,
  CreditCard,FileText,Globe2,Handshake,Link2,LockKeyhole,MessageCircle,
  Package,Plus,RotateCcw,ShieldCheck,ShoppingBag,Sparkles,Store,Trash2,
  UsersRound,Wallet
} from 'lucide-react';
import type {MiniLanguage} from './miniModel';
import {
  amount,copyDemo,createEnquiry,guideReply,listed,logDemo,progressAgreement,
  quoteEnquiry,upsertOffer,type BusinessDemo,type Listing,type AgreementDemo,type TeamDemo
} from './MiniBusinessDemoModel';

type Area='identity'|'people'|'store'|'network'|'guide'|'agreements'|'money'|'tax'|'plan'|'privacy';
type StoreTab='offers'|'customer'|'enquiries';
const menu:{id:Area;name:string;hint:string;icon:typeof Store}[]=[
 {id:'identity',name:'Business identity',hint:'Your customer-facing profile',icon:BriefcaseBusiness},
 {id:'people',name:'People & access',hint:'Invite and manage helpers',icon:UsersRound},
 {id:'store',name:'My Store',hint:'Offers, buyers and enquiries',icon:ShoppingBag},
 {id:'network',name:'Store Network',hint:'Where buyers can discover offers',icon:Globe2},
 {id:'guide',name:'Store Guide · KS001',hint:'Test answers about real listed offers',icon:Sparkles},
 {id:'agreements',name:'Living Agreements',hint:'Quotation, approval and work',icon:Handshake},
 {id:'money',name:'Checkout & Money',hint:'Prepare a stage from agreed terms',icon:Wallet},
 {id:'tax',name:'Invoices & eTIMS',hint:'Draft an invoice for the correct buyer',icon:FileText},
 {id:'plan',name:'Membership',hint:'Your Business plan',icon:CreditCard},
 {id:'privacy',name:'Privacy & activity',hint:'Visibility and changes',icon:ShieldCheck}
];
const blankOffer=(id:string):Listing=>({
 id,title:'',description:'',price:null,unit:'each',quantity:0,
 stockChecked:false,visible:false,delivery:false,version:0
});
const stages:Record<AgreementDemo['state'],string>={
 draft:'Draft quotation',sent:'Waiting for buyer review',reviewed:'Buyer reviewed (simulation)',
 accepted:'Accepted in simulation',working:'Work in progress (simulation)',completed:'Completed in simulation'
};
function Quiet({children}:{children:ReactNode}) {return <div className="spm-bs-hint"><LockKeyhole size={15}/><span>{children}</span></div>;}
function MiniButton({children,onClick,disabled=false,secondary=false}:{
 children:ReactNode;onClick:()=>void;disabled?:boolean;secondary?:boolean
}) {return <button type="button" disabled={disabled} onClick={onClick}
 className={secondary?'spm-bs-small-button secondary':'spm-bs-small-button'}>{children}</button>;}
function Txt({name,value,onChange,placeholder='',limit=120,kind='text'}:{
 name:string;value:string;onChange:(x:string)=>void;placeholder?:string;limit?:number;kind?:'text'|'number'
}) {return <label className="spm-bs-input-label"><span>{name}</span><input type={kind} inputMode={kind==='number'?'decimal':undefined}
 className="spm-field" maxLength={kind==='text'?limit:undefined}
 value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;}
function Checkbox({label,detail,checked,onChange,disabled=false}:{
 label:string;detail:string;checked:boolean;onChange:()=>void;disabled?:boolean
}) {return <label className="spm-bs-check"><input type="checkbox" checked={checked} disabled={disabled} onChange={onChange}/>
 <span><strong>{label}</strong><small>{detail}</small></span></label>;}
function Badge({children}:{children:ReactNode}){return <span className="spm-bs-mini-badge">{children}</span>;}

export function MiniBusinessSettings({language,onBack,demo,setDemo,initialArea,onOpenVerifiedStore,verifiedStoreAvailable}:{
 language:MiniLanguage;onBack:()=>void;demo:BusinessDemo;setDemo:Dispatch<SetStateAction<BusinessDemo>>;
 initialArea?: Area;
 onOpenVerifiedStore: () => void;
 verifiedStoreAvailable: boolean;
}) {
 const [area,setArea]=useState<Area|null>(initialArea??null);
 const [tab,setTab]=useState<StoreTab>('offers');
 const [profileName,setProfileName]=useState(demo.name);
 const [profilePlace,setProfilePlace]=useState(demo.place);
 const [profileSummary,setProfileSummary]=useState(demo.summary);
 const [teamName,setTeamName]=useState('');
 const [teamRole,setTeamRole]=useState<TeamDemo['role']>('Store editor');
 const [draft,setDraft]=useState<Listing|null>(null);
 const [qty,setQty]=useState(1);
 const [quoteTerms,setQuoteTerms]=useState('Supply subject to agreed collection or delivery time.');
 const [guideQuestion,setGuideQuestion]=useState('Do you have solar floodlights?');
 const [guideAnswer,setGuideAnswer]=useState('');
 const [recipient,setRecipient]=useState('Example buyer · for tax invoice');
 const [notice,setNotice]=useState('');
 const title=menu.find(x=>x.id===area)?.name;
 const safe=(msg:string)=>setNotice(msg);
 const choose=(id:Area)=>{setArea(id);setNotice('');setDraft(null);};
 const back=()=>{if(draft){setDraft(null);return;}if(area){setArea(null);setNotice('');return;}onBack();};
 const mutate=(action:(prev:BusinessDemo)=>BusinessDemo)=>setDemo(action);
 const liveOffers=demo.offers.filter(listed);
 const newEnquiries=demo.enquiries.filter(e=>e.status==='new');
 const accepted=demo.agreements.filter(a=>['accepted','working','completed'].includes(a.state));
 const saveProfile=()=>{if(!profileName.trim()||!profilePlace.trim()){safe('Enter a Business name and service area.');return;}
   mutate(prev=>logDemo(prev,'Changed example Business profile',{
      name:profileName.trim().slice(0,80),place:profilePlace.trim().slice(0,100),
      summary:profileSummary.trim().slice(0,180)
   }));safe('Preview profile updated. See it in the Store, Guide and invoices.');};
 const saveOffer=()=>{if(!draft)return;
   if(!draft.title.trim()||draft.quantity<0||!Number.isInteger(draft.quantity)||draft.price!==null&&(!Number.isFinite(draft.price)||draft.price<0)) {
     safe('Enter a name, a valid quantity and a valid price or quotation pricing.');return;
   }
   mutate(prev=>upsertOffer(prev,draft));
   safe('Offer saved in this demonstration. Open Customer view to check what shoppers can see.');
   setDraft(null);};
 const publish=(offer:Listing)=>{if(!offer.visible&&!offer.stockChecked){safe('Confirm sample stock and quantity before publishing.');return;}
   if(!offer.visible&&offer.quantity<=0){safe('Enter a positive sample stock quantity before listing.');return;}
   mutate(prev=>upsertOffer(prev,{...offer,visible:!offer.visible}));safe('Store visibility updated in this demonstration.');};
 const ask=(id:string)=>{mutate(prev=>createEnquiry(prev,id,qty));setTab('enquiries');safe('A fictional customer enquiry was added. You can now prepare a quote.');};
 const makeQuote=(id:string)=>{const old=demo.enquiries.find(e=>e.id===id);const offer=demo.offers.find(o=>o.id===old?.offerId);
   if(!offer?.price){safe('This offer needs a price before a quotation can be prepared.');return;}
   if(!offer.stockChecked||offer.quantity<(old?.quantity||0)){safe('Confirm enough stock first.');return;}
   mutate(prev=>quoteEnquiry(prev,id,quoteTerms));choose('agreements');safe('Quotation draft prepared from the current sample offer version.');};
 const advance=(id:string,next:AgreementDemo['state'])=>mutate(prev=>progressAgreement(prev,id,next));
 const addEvidence=(id:string)=>mutate(prev=>logDemo(prev,'Added fictional work evidence to '+id,{
   agreements:prev.agreements.map(a=>a.id===id?{...a,evidence:[...a.evidence,'Sample delivery photo/evidence note']}:a)
 }));
 const paymentDraft=(id:string)=>mutate(prev=>logDemo(prev,'Prepared illustrative payment-stage request for '+id,{
   agreements:prev.agreements.map(a=>a.id===id?{...a,paymentPlan:true}:a)
 }));
 const createInvoice=(id:string)=>{const a=demo.agreements.find(v=>v.id===id);
   if(!a||!accepted.some(v=>v.id===id)||!recipient.trim()){safe('Choose an accepted demo Agreement and enter an invoice recipient.');return;}
   if(demo.invoices.some(i=>i.agreementId===id)){safe('A draft for this example Agreement already exists.');return;}
   const offer=demo.offers.find(o=>o.id===a.offerId);
   mutate(prev=>logDemo(prev,'Prepared fictional invoice draft for '+id,{
     invoices:[{id:'I-'+prev.sequence,agreementId:id,recipient:recipient.slice(0,100),
     description:offer?.title||'Goods or services',amount:a.quantity*a.unitPrice},...prev.invoices],sequence:prev.sequence+1
   }));
   safe('Invoice draft prepared locally. No eTIMS document was submitted.');};

 return <section className="spm-content spm-bs spm-bs-working">
  <button type="button" className="spm-back" onClick={back}><ArrowLeft size={18}/>{draft?'Back to offers':area?'Business Settings':'Back to Mini'}</button>
  <div className="spm-persona"><Sparkles size={16}/><span>{demo.name}</span><span className="spm-dot"/><span>Interactive demo</span></div>
  {!area ? <>
    <h1 className="spm-question">Business Settings</h1>
    <p className="spm-lead">Manage what your Business actually offers, who can help, and how an enquiry becomes work.</p>
    <div className="spm-bs-context"><Store size={18}/><span><strong>{demo.name}</strong><small>{liveOffers.length} visible sample offers · {newEnquiries.length} enquiries · {demo.agreements.length} agreements</small></span></div>
    <div className="spm-bs-menu">{menu.map(m=>{const Icon=m.icon;return <button type="button" key={m.id} className="spm-bs-item" onClick={()=>choose(m.id)}>
      <span className="spm-bs-icon"><Icon size={19}/></span><span className="spm-bs-item-title"><strong>{m.name}</strong><small>{m.hint}</small></span><ChevronRight size={16}/>
    </button>;})}</div>
    <Quiet>This is an interactive fictional Business, not a signed-in merchant. Changes here affect these example screens, not SecurePay accounts or live Store stock.</Quiet>
    <div className="spm-bs-muted"><strong>One Mini. Your whole Business.</strong>
    <p>When more space is useful, these same Mini tools can expand—without sending you to another product.</p></div>
  </> : <>
    <div className="spm-bs-subhead"><span>{title}</span><span>Try it here</span></div>
    <h1 className="spm-question">{title}</h1>
    {area==='identity'&&<>
      <p className="spm-lead">Edit this fictional Business. The name and location also appear in your Store and Guide.</p>
      <Txt name="Business name" value={profileName} onChange={setProfileName}/>
      <Txt name="Service area" value={profilePlace} onChange={setProfilePlace}/>
      <label className="spm-bs-input-label"><span>What you offer</span><textarea className="spm-field" rows={2} maxLength={180} value={profileSummary} onChange={e=>setProfileSummary(e.target.value)}/></label>
      <MiniButton onClick={saveProfile}><Check size={15}/> Update sample profile</MiniButton>
      <Quiet>A live Business KSNumber, ownership and legal/tax details require verified server records.</Quiet>
    </>}
    {area==='people'&&<>
      <p className="spm-lead">Make a fictional staff invitation, assign a limited role, or revoke a pending invitation.</p>
      <Txt name="Colleague label (invented name only)" value={teamName} onChange={setTeamName} placeholder="For example: Demo assistant"/>
      <label className="spm-bs-input-label"><span>Role</span><select className="spm-field" value={teamRole} onChange={e=>setTeamRole(e.target.value as TeamDemo['role'])}>
        <option>Store editor</option><option>Agreement assistant</option><option>Read only</option></select></label>
      <MiniButton disabled={!teamName.trim()} onClick={()=>{
        mutate(prev=>logDemo(prev,'Created pending fictional staff invitation',{
          team:[{id:'t'+prev.sequence,label:teamName.slice(0,60),role:teamRole,status:'pending'},...prev.team],sequence:prev.sequence+1
        }));setTeamName('');safe('Pending demo invitation created; no notification sent.');}}><Plus size={16}/> Add pending invitation</MiniButton>
      <div className="spm-bs-stack">{demo.team.map(t=><div className="spm-bs-offer" key={t.id}>
        <strong>{t.label}</strong><small>{t.role} · Pending, not accepted</small>
        <button className="spm-bs-link" type="button" onClick={()=>mutate(prev=>logDemo(prev,'Revoked fictional pending invitation',{
          team:prev.team.filter(x=>x.id!==t.id)}))}><Trash2 size={14}/> Revoke</button>
      </div>)}</div>
      <Quiet>No role is active until the real person accepts, and no member can see private Inbox messages or move Money simply by joining.</Quiet>
    </>}
    {area==='store'&&<>
      <p className="spm-lead">Your Store is where customers learn what you actually offer. See, edit, and test what they can discover.</p>
      <div className="spm-bs-offer">
        <strong>Your verified SecurePay Store</strong>
        <p>Open the actual seller tool inside Mini to load authorised offers, update your Store, and prepare buyer quotations.</p>
        <MiniButton onClick={onOpenVerifiedStore} disabled={!verifiedStoreAvailable}>
          <Store size={15}/> Open verified Store <ArrowRight size={15}/>
        </MiniButton>
        {!verifiedStoreAvailable && <small>The authorised Store connection is not configured on this preview. No live account can be opened here.</small>}
      </div>
      <div className="spm-bs-tabs">{([['offers','My offers'],['customer','Customer view'],['enquiries','Enquiries']] as const).map(([id,label])=>
        <button type="button" key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setDraft(null);setNotice('');}}>{label}{id==='enquiries'&&newEnquiries.length>0?' ('+newEnquiries.length+')':''}</button>)}</div>
      {tab==='offers'&&!draft&&<>
        <div className="spm-bs-summary"><strong>{demo.offers.length} offers</strong><span>{liveOffers.length} available to sample buyers</span></div>
        <MiniButton onClick={()=>{setDraft(blankOffer('o'+demo.sequence));setNotice('');}}><Plus size={16}/> Add an offer</MiniButton>
        <div className="spm-bs-stack">{demo.offers.map(o=><div className="spm-bs-offer" key={o.id}>
          <div className="spm-bs-offer-heading"><strong>{o.title}</strong><Badge>{listed(o)?'Visible':'Hidden'}</Badge></div>
          <p>{o.description}</p><small>{amount(o.price)} / {o.unit} · Stock: {o.quantity} · Offer v{o.version}</small>
          <small>{o.stockChecked?'Sample stock marked checked':'Availability needs checking'} · {o.delivery?'Delivery possible':'Collection only'}</small>
          <div className="spm-bs-actions">
            <MiniButton secondary onClick={()=>{setDraft({...o});setNotice('');}}>Edit</MiniButton>
            <MiniButton secondary onClick={()=>publish(o)}>{o.visible?'Hide offer':'List offer'}</MiniButton>
          </div>
        </div>)}</div>
      </>}
      {tab==='offers'&&draft&&<>
        <div className="spm-bs-offer"><strong>{draft.version?'Edit offer':'New offer'}</strong><small>Changes stay within this demonstration.</small></div>
        <Txt name="Offer title" value={draft.title} onChange={v=>setDraft(p=>p&&({...p,title:v}))} limit={90}/>
        <label className="spm-bs-input-label"><span>Description</span><textarea className="spm-field" rows={3} maxLength={300} value={draft.description} onChange={e=>setDraft(p=>p&&({...p,description:e.target.value}))}/></label>
        <Txt name="Price in KSh (blank = quotation)" value={draft.price===null?'':String(draft.price)} kind="number" onChange={v=>setDraft(p=>p&&({...p,price:v.trim()?Number(v):null}))}/>
        <Txt name="Selling unit" value={draft.unit} onChange={v=>setDraft(p=>p&&({...p,unit:v}))}/>
        <Txt name="Quantity in sample stock" value={String(draft.quantity)} kind="number" onChange={v=>setDraft(p=>p&&({...p,quantity:Number(v)}))}/>
        <Checkbox label="I've checked this sample stock" detail="You can only list available items after confirming a positive quantity." checked={draft.stockChecked} onChange={()=>setDraft(p=>p&&({...p,stockChecked:!p.stockChecked}))}/>
        <Checkbox label="Show in the sample Store" detail="Only stock-checked items with quantity can appear in Customer view." checked={draft.visible} onChange={()=>setDraft(p=>p&&({...p,visible:!p.visible}))}/>
        <Checkbox label="Delivery available" detail="Delivery must still be agreed with the buyer." checked={draft.delivery} onChange={()=>setDraft(p=>p&&({...p,delivery:!p.delivery}))}/>
        <MiniButton onClick={saveOffer}><Check size={15}/> Save sample offer</MiniButton>
      </>}
      {tab==='customer'&&<>
        <div className="spm-bs-buyer-header"><Store size={18}/><span><strong>{demo.name}</strong><small>{demo.place}</small></span></div>
        <p className="spm-bs-caption">This is what a fictional shopper can see from your current local offer settings.</p>
        {liveOffers.length===0?<p className="spm-bs-empty">No offers visible. Check stock and list at least one offer in My offers.</p>:liveOffers.map(o=><div className="spm-bs-offer" key={o.id}>
          <strong>{o.title}</strong><p>{o.description}</p><small>{amount(o.price)} / {o.unit} · {o.quantity} sample units</small>
          <div className="spm-bs-actions"><MiniButton onClick={()=>ask(o.id)}><MessageCircle size={14}/> Ask for quotation</MiniButton></div>
        </div>)}
      </>}
      {tab==='enquiries'&&<>
        <p className="spm-bs-caption">A customer asking is not yet an Agreement. Confirm the actual offer before preparing terms.</p>
        {demo.enquiries.length===0&&<p className="spm-bs-empty">No enquiries. Try the Customer view and ask about an offer.</p>}
        {demo.enquiries.map(q=>{const o=demo.offers.find(o=>o.id===q.offerId);return <div className="spm-bs-offer" key={q.id}>
          <div className="spm-bs-offer-heading"><strong>{q.buyer}</strong><Badge>{q.status}</Badge></div>
          <p>{q.question}</p><small>{o?.title||'Offer unavailable'} · Qty {q.quantity}</small>
          {q.status==='new'&&<><label className="spm-bs-input-label"><span>Terms for this quotation</span>
             <textarea className="spm-field" rows={2} maxLength={300} value={quoteTerms} onChange={e=>setQuoteTerms(e.target.value)}/></label>
            <MiniButton disabled={!o?.price||!o.stockChecked} onClick={()=>makeQuote(q.id)}>Prepare quotation <ArrowRight size={15}/></MiniButton>
          </>}
          {q.status==='quoted'&&<button type="button" className="spm-bs-link" onClick={()=>choose('agreements')}>View its quotation <ArrowRight size={14}/></button>}
        </div>;})}
      </>}
      <Quiet>No real stock, buyer messages or public Store records are changed here. Publishing is only within this fictional Store.</Quiet>
    </>}
    {area==='network'&&<>
      <p className="spm-lead">Your preference changes where the fictional Store appears. Actual community approval is separate.</p>
      {([['mini','SecurePay Mini'],['estate','Varsityville Estate'],['shortstays','Shortstays']] as const).map(([id,label])=><Checkbox key={id} label={label} checked={demo.networks[id]} detail={'Example choice. '+(id==='mini'?'Show eligible offers in Mini.':'Host verification is still required.')}
       onChange={()=>mutate(prev=>logDemo(prev,'Changed fictional network preference: '+label,{
         networks:{...prev.networks,[id]:!prev.networks[id]}}))}/>)}
      <div className="spm-bs-offer"><strong>Discoverable catalogue (preview)</strong><small>{liveOffers.length} eligible sample offers, subject to each host's checks.</small>
        {liveOffers.map(o=><p key={o.id}>{o.title} · {amount(o.price)}</p>)}</div>
      <Quiet>These preferences do not publish to Varsityville, Shortstays or any real network. Sensitive transport and storage providers require separate vetting.</Quiet>
    </>}
    {area==='guide'&&<>
      <p className="spm-lead">Test what KS001 would say to a buyer, based only on the offers you marked visible and stock-checked.</p>
      <Checkbox label="Offer Store Guide" detail="Sample on/off setting for this Business." checked={demo.guideEnabled} onChange={()=>mutate(prev=>logDemo(prev,'Changed sample Store Guide availability',{guideEnabled:!prev.guideEnabled}))}/>
      <label className="spm-bs-input-label"><span>Ask the sample Store Guide</span><textarea className="spm-field" rows={2} value={guideQuestion} onChange={e=>setGuideQuestion(e.target.value)} maxLength={200}/></label>
      <MiniButton onClick={()=>setGuideAnswer(guideReply(demo,guideQuestion))}><Sparkles size={15}/> Ask about my offers</MiniButton>
      {guideAnswer&&<div className="spm-bs-guide-reply"><strong>KS001 · Preview response</strong><p>{guideAnswer}</p></div>}
      <div className="spm-bs-actions"><MiniButton secondary onClick={()=>{setGuideQuestion('Do you have cement?');setGuideAnswer('');}}>Ask about cement</MiniButton>
        <MiniButton secondary onClick={()=>{setGuideQuestion('Do you have local delivery?');setGuideAnswer('');}}>Ask about delivery</MiniButton></div>
      <Quiet>KS001 cannot invent a product, claim unverified availability, accept Agreement terms or initiate payment.</Quiet>
    </>}
    {area==='agreements'&&<>
      <p className="spm-lead">Follow a quotation from the merchant's proposal through separate buyer review and accepted work.</p>
      {demo.agreements.length===0&&<p className="spm-bs-empty">No draft quotation yet. Open My Store → Enquiries and prepare one.</p>}
      {demo.agreements.map(a=>{const o=demo.offers.find(o=>o.id===a.offerId);return <div className="spm-bs-offer" key={a.id}>
        <div className="spm-bs-offer-heading"><strong>{o?.title||'Offer'} · {a.id}</strong><Badge>v{a.version}</Badge></div>
        <small>{stages[a.state]}</small><p>{a.buyer}: {a.quantity} × {amount(a.unitPrice)} = <b>{amount(a.quantity*a.unitPrice)}</b></p>
        <p>Terms: {a.terms}</p><small>Based on offer version {a.offerVersion}; seller's original terms remain unchanged.</small>
        <div className="spm-bs-actions">
          {a.state==='draft'&&<MiniButton onClick={()=>advance(a.id,'sent')}>Send sample quote for review <ArrowRight size={14}/></MiniButton>}
          {a.state==='sent'&&<MiniButton onClick={()=>advance(a.id,'reviewed')}>Simulate buyer review <ArrowRight size={14}/></MiniButton>}
          {a.state==='reviewed'&&<MiniButton onClick={()=>advance(a.id,'accepted')}>Simulate buyer acceptance <Check size={14}/></MiniButton>}
          {a.state==='accepted'&&<MiniButton onClick={()=>advance(a.id,'working')}>Start sample work <ArrowRight size={14}/></MiniButton>}
          {a.state==='working'&&<>
            <MiniButton secondary onClick={()=>addEvidence(a.id)}>Add sample work evidence</MiniButton>
            <MiniButton disabled={!a.evidence.length} onClick={()=>advance(a.id,'completed')}>Mark sample work complete</MiniButton>
          </>}
          {a.state==='completed'&&<Badge>Example completed</Badge>}
        </div>
        {a.evidence.length>0&&<small>{a.evidence.length} sample evidence entries attached</small>}
        <button type="button" className="spm-bs-link" onClick={()=>{
           const detail='SECURELINK DEMO ONLY — '+demo.name+' / '+a.id+' / v'+a.version+' / '+stages[a.state]+'. No actual URL or payment authority.';
           if(typeof navigator!=='undefined'&&navigator.clipboard) void navigator.clipboard.writeText(detail).then(()=>safe('Copied a sample summary, not a SecureLink.')).catch(()=>safe(detail));
           else safe(detail);
        }}><Link2 size={14}/> Copy demo summary (not a live SecureLink)</button>
      </div>;})}
      <Quiet>In real SecurePay each person must authenticate and approve their own version. The buttons above explicitly simulate buyer actions; they do not create or accept any real Agreement.</Quiet>
    </>}
    {area==='money'&&<>
      <p className="spm-lead">Only Agreements with simulated buyer acceptance can prepare a fictional Money-stage request.</p>
      {accepted.length===0&&<p className="spm-bs-empty">No accepted examples yet. Prepare a quotation, send it, then simulate buyer review and acceptance.</p>}
      {accepted.map(a=><div className="spm-bs-offer" key={a.id}>
        <strong>Agreement {a.id} · {amount(a.quantity*a.unitPrice)}</strong>
        <small>{stages[a.state]}</small>
        {a.paymentPlan?<p className="spm-bs-note">Illustrative payment stage prepared, but cannot be sent to a provider.</p>:
          <MiniButton onClick={()=>paymentDraft(a.id)}>Prepare payment stage (demo) <ArrowRight size={14}/></MiniButton>}
      </div>)}
      <div className="spm-bs-feature"><CreditCard size={17}/><span><strong>Provider & payout</strong><small>Not connected or certified · No money controls</small></span></div>
      <Quiet>No payment initiation, custody, fee quote, settlement or release can occur in this sample workspace.</Quiet>
    </>}
    {area==='tax'&&<>
      <p className="spm-lead">Prepare an invoice draft for the right recipient after terms are accepted. eTIMS is separate.</p>
      <Txt name="Invoice recipient (fictional)" value={recipient} onChange={setRecipient}/>
      <Checkbox label="Explore eTIMS integration" detail="Preference only; no KRA account is connected." checked={demo.etimsWanted}
        onChange={()=>mutate(prev=>logDemo(prev,'Changed eTIMS integration interest',{etimsWanted:!prev.etimsWanted}))}/>
      {accepted.map(a=><div className="spm-bs-offer" key={a.id}>
        <strong>Agreement {a.id} · {amount(a.quantity*a.unitPrice)}</strong>
        <MiniButton disabled={demo.invoices.some(i=>i.agreementId===a.id)} onClick={()=>createInvoice(a.id)}>Prepare invoice draft</MiniButton>
      </div>)}
      {demo.invoices.map(i=><div className="spm-bs-offer" key={i.id}><Badge>Draft only · not issued</Badge>
        <strong>Invoice {i.id}</strong><p>Bill to: {i.recipient}</p><p>{i.description}</p>
        <p>Amount: {amount(i.amount)} · Agreement {i.agreementId}</p></div>)}
      <Quiet>There is no eTIMS submission, legal invoice issuance, tax calculation or input-VAT entitlement in this demonstration.</Quiet>
    </>}
    {area==='plan'&&<>
      <p className="spm-lead">SecurePay for Business membership is separate from the personal For You plan.</p>
      <div className="spm-bs-plan"><small>SecurePay for Business</small><strong>KSh 200 <span>/ month</span></strong><p>{demo.planWanted?'Selected for review in this simulation':'No Business subscription active.'}</p></div>
      <MiniButton onClick={()=>mutate(prev=>logDemo(prev,'Changed example Business plan selection',{planWanted:!prev.planWanted}))}>{demo.planWanted?'Remove sample selection':'Choose plan for review'}</MiniButton>
      <Quiet>No billing authorization, subscription or charge is created by choosing a preview plan.</Quiet>
    </>}
    {area==='privacy'&&<>
      <p className="spm-lead">Keep Business visibility and permissions separate from the individual KSNumber.</p>
      <Checkbox label="Request a directory listing" detail="Voluntary and subject to host rules." checked={demo.directory} onChange={()=>mutate(prev=>logDemo(prev,'Changed example community directory preference',{directory:!prev.directory}))}/>
      <div className="spm-bs-offer"><strong>Recent actions in this demo</strong>
        {demo.activity.length?demo.activity.map((s,i)=><small key={i}>{s}</small>):<small>Change an offer or another setting to see your actions appear here.</small>}
      </div>
      <MiniButton secondary onClick={()=>{setDemo(copyDemo());setNotice('Sample Business reset. No real information was affected.');}}>Reset fictional Business <RotateCcw size={14}/></MiniButton>
      <Quiet>No Business setting lets staff see personal Inbox messages; real consent, authentication and permissions must be checked by SecurePay.</Quiet>
    </>}
    {notice&&<p className="spm-bs-note" role="status">{notice}</p>}
    <div className="spm-bs-preview-foot"><ShieldCheck size={16}/><span>Functional sample records only. No real customer, store, tax, account or Money system is connected.</span></div>
    <MiniButton secondary onClick={()=>setArea(null)}>All Business Settings <ArrowRight size={14}/></MiniButton>
  </>}
 </section>;
}
