import { useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, Bell, BookOpenText, BriefcaseBusiness, CheckCircle2,
  ChevronRight, CreditCard, FileText, Globe2, Handshake, KeyRound, Link2,
  LockKeyhole, MessageCircle, Package, ShieldCheck, ShoppingBag, Sparkles,
  Store, UserRoundCog, UsersRound, Wallet
} from 'lucide-react';
import type { MiniLanguage } from './miniModel';

type Area = 'identity'|'people'|'store'|'network'|'guide'|'agreements'|'money'|'tax'|'plan'|'privacy';
type PreviewFlag =
  | 'questions' | 'delivery' | 'estate' | 'shortstays' | 'mini'
  | 'guide' | 'quotation' | 'notify' | 'invoiceBuyer' | 'etims'
  | 'directory' | 'alerts';

const settings: { id: Area; title:string; summary:string; icon:typeof Store }[] = [
  { id:'identity', title:'Business identity', summary:'Name, address and who represents you', icon:BriefcaseBusiness },
  { id:'people', title:'People & access', summary:'Staff invitations and permissions', icon:UsersRound },
  { id:'store', title:'My Store', summary:'Offers, stock and delivery', icon:ShoppingBag },
  { id:'network', title:'Where my Store appears', summary:'Communities and other apps', icon:Globe2 },
  { id:'guide', title:'Store Guide · KS001', summary:'Answers using verified Store facts', icon:Sparkles },
  { id:'agreements', title:'Agreements & SecureLinks', summary:'Offers, approvals and progress', icon:Handshake },
  { id:'money', title:'Checkout & Money', summary:'Payment routes and status', icon:Wallet },
  { id:'tax', title:'Invoices & eTIMS', summary:'Buyer invoices and tax integration', icon:FileText },
  { id:'plan', title:'My Business plan', summary:'Membership and billing', icon:CreditCard },
  { id:'privacy', title:'Privacy & connections', summary:'Visibility and security', icon:ShieldCheck },
];

const initialFlags: Record<PreviewFlag,boolean> = {
  questions:true,delivery:true,estate:false,shortstays:false,mini:true,
  guide:true,quotation:true,notify:true,invoiceBuyer:true,etims:false,
  directory:false,alerts:true
};
function Toggle({label,detail,checked,onChange,locked=false}:{
  label:string;detail:string;checked:boolean;onChange:()=>void;locked?:boolean;
}) {
  return <div className="spm-bs-setting-line">
    <span><strong>{label}</strong><small>{detail}</small></span>
    <button type="button" role="switch" aria-label={label} aria-checked={checked}
      disabled={locked} onClick={onChange} className={'spm-bs-switch'+(checked?' active':'')}>
      <span/>
    </button>
  </div>;
}
function Hint({children}:{children:ReactNode}) {
  return <div className="spm-bs-hint"><LockKeyhole size={15}/><span>{children}</span></div>;
}
function Note({children}:{children:ReactNode}) {
  return <p className="spm-bs-note">{children}</p>;
}

export function MiniBusinessSettings({language,onBack}:{
  language:MiniLanguage;onBack:()=>void;
}) {
  const sw=language==='sw';
  const [area,setArea]=useState<Area|null>(null);
  const [flags,setFlags]=useState({...initialFlags});
  const [name,setName]=useState('Kamakis Traders');
  const [location,setLocation]=useState('Kamakis · Ruiru');
  const [guideWelcome,setGuideWelcome]=useState('Hello. What would you like to find?');
  const [teamKs,setTeamKs]=useState('');
  const [role,setRole]=useState('Store editor');
  const [showInvite,setShowInvite]=useState(false);
  const [showRoles,setShowRoles]=useState(false);
  const setFlag=(id:PreviewFlag)=>setFlags(f=>({...f,[id]:!f[id]}));
  const selected=settings.find(s=>s.id===area);
  const back=()=>{
    if(area){setArea(null);setShowInvite(false);}
    else onBack();
  };
  const choose=(id:Area)=>{
    setArea(id);
    setShowInvite(false);
  };
  return <section className="spm-content spm-bs">
    <button type="button" className="spm-back" onClick={back}><ArrowLeft size={18}/>{area?'Business Settings':sw?'Rudi Mini':'Back to Mini'}</button>
    <div className="spm-persona"><ShieldCheck size={16}/><span>{sw?'Biashara yako':'Kamakis Traders'}</span><span className="spm-dot"/><span>Preview</span></div>
    {area===null ? <>
      <h1 className="spm-question">{sw?'Mipangilio ya biashara':'Business Settings'}</h1>
      <p className="spm-lead">Your Business, your people, your rules. Choose just what you need to manage.</p>
      <div className="spm-bs-context"><BriefcaseBusiness size={17}/><span><strong>Kamakis Traders</strong><small>Example Business · No real account connected</small></span></div>
      <div className="spm-bs-menu">
        {settings.map(item=>{
          const Icon=item.icon;
          return <button type="button" key={item.id} onClick={()=>choose(item.id)} className="spm-bs-item">
            <span className="spm-bs-icon"><Icon size={19}/></span>
            <span className="spm-bs-item-title"><strong>{item.title}</strong><small>{item.summary}</small></span>
            <ChevronRight size={16}/>
          </button>;
        })}
      </div>
      <div className="spm-bs-muted">
        <strong>Need a bigger view?</strong>
        <p>The full Business Desk is available for more detailed administration without changing the Mini experience.</p>
        <a href="/business-settings.html">Open full Business Desk <ArrowRight size={14}/></a>
      </div>
    </> : <>
      <div className="spm-bs-subhead"><span>{selected?.title}</span><span>Example settings</span></div>
      <h1 className="spm-question">{selected?.title}</h1>
      {area==='identity' && <>
        <p className="spm-lead">Let customers know exactly which Business they are dealing with.</p>
        <label className="spm-label" htmlFor="bs-name">Business name</label>
        <input className="spm-field" id="bs-name" value={name} maxLength={80} onChange={e=>setName(e.target.value)}/>
        <label className="spm-label" htmlFor="bs-place">Where you serve customers</label>
        <input className="spm-field" id="bs-place" value={location} maxLength={100} onChange={e=>setLocation(e.target.value)}/>
        <Hint>A Business KSNumber must come from SecurePay after verification. These example details do not create a Business or claim legal registration.</Hint>
      </>}
      {area==='people' && <>
        <p className="spm-lead">Choose who can help you. A staff member must only do work they're allowed to do.</p>
        <div className="spm-bs-context"><UserRoundCog size={18}/><span><strong>Business administrator</strong><small>Example role, not a connected staff account</small></span></div>
        <button type="button" onClick={()=>setShowRoles(v=>!v)} className="spm-bs-item spm-bs-simple">
          <span className="spm-bs-item-title"><strong>What can different people do?</strong><small>View role examples</small></span><ChevronRight size={16}/>
        </button>
        {showRoles && <div className="spm-bs-details"><p><b>Store editor:</b> keep offers accurate.</p><p><b>Agreement assistant:</b> prepare responses, not accept terms for others.</p><p><b>Read only:</b> see only explicitly authorised Business records.</p></div>}
        <label className="spm-label" htmlFor="bs-team">Invite a KSNumber (sample only)</label>
        <input className="spm-field" id="bs-team" placeholder="Use invented details" value={teamKs} maxLength={40} onChange={e=>setTeamKs(e.target.value)}/>
        <label className="spm-label" htmlFor="bs-role">Suggested role</label>
        <select className="spm-field" id="bs-role" value={role} onChange={e=>setRole(e.target.value)}>
          <option>Store editor</option><option>Agreement assistant</option><option>Read only</option>
        </select>
        <button type="button" className="spm-primary" disabled={!teamKs.trim()} onClick={()=>setShowInvite(true)}>Review invitation steps <ArrowRight size={17}/></button>
        {showInvite && <Note>Before any invitation, SecurePay checks your authority; then the person reviews and accepts it. No invitation has been sent.</Note>}
        <Hint>Business membership does not expose staff members' personal messages or grant payment control.</Hint>
      </>}
      {area==='store' && <>
        <p className="spm-lead">Make your Store useful without making promises you cannot keep.</p>
        <Toggle label="Let buyers ask about offers" detail="A question can lead to a quotation." checked={flags.questions} onChange={()=>setFlag('questions')}/>
        <Toggle label="Offer delivery or collection" detail="Final location, availability and cost must be confirmed." checked={flags.delivery} onChange={()=>setFlag('delivery')}/>
        <Toggle label="Only show verified stock" detail="An essential rule that cannot be switched off." checked={true} onChange={()=>{}} locked/>
        <Hint>All these controls are local examples. No real products have been published or changed.</Hint>
      </>}
      {area==='network' && <>
        <p className="spm-lead">Choose where eligible people may discover your Store.</p>
        <Toggle label="SecurePay Mini" detail="People may discover suitable verified offers." checked={flags.mini} onChange={()=>setFlag('mini')}/>
        <Toggle label="Varsityville Estate" detail="Only after the Estate's eligibility rules are met." checked={flags.estate} onChange={()=>setFlag('estate')}/>
        <Toggle label="Shortstays" detail="Only separately eligible guest and host services." checked={flags.shortstays} onChange={()=>setFlag('shortstays')}/>
        <Hint>My Ride and Storage require separate verification. These switches do not publish a Store or bypass host permission.</Hint>
      </>}
      {area==='guide' && <>
        <p className="spm-lead">Help customers ask the right questions using only verified Store information.</p>
        <label className="spm-label" htmlFor="bs-welcome">Store Guide greeting</label>
        <textarea className="spm-field" rows={2} id="bs-welcome" value={guideWelcome} maxLength={160} onChange={e=>setGuideWelcome(e.target.value)}/>
        <Toggle label="Show Store Guide · KS001" detail="Subject to a real Store knowledge connection." checked={flags.guide} onChange={()=>setFlag('guide')}/>
        <Toggle label="Help request a quotation" detail="The merchant confirms stock, price and delivery." checked={flags.quotation} onChange={()=>setFlag('quotation')}/>
        <Toggle label="Never invent stock or a price" detail="Always enforced." checked={true} onChange={()=>{}} locked/>
        <Hint>KS001 cannot approve an Agreement, impersonate a merchant, or authorise Money.</Hint>
      </>}
      {area==='agreements' && <>
        <p className="spm-lead">Keep offers, messages, acceptance and actual work attached to the correct Agreement.</p>
        <div className="spm-bs-feature"><Link2 size={17}/><span><strong>SecureLinks</strong><small>Share the authorised evolving record across channels.</small></span></div>
        <Toggle label="Notify participants about changes" detail="Only the relevant authorised people." checked={flags.notify} onChange={()=>setFlag('notify')}/>
        <Toggle label="Everyone reviews their own terms" detail="Independent acceptance always required." checked={true} onChange={()=>{}} locked/>
        <Toggle label="Keep accepted versions unchanged" detail="Amendments need a new reviewed version." checked={true} onChange={()=>{}} locked/>
      </>}
      {area==='money' && <>
        <p className="spm-lead">Money follows what the parties have agreed to.</p>
        <div className="spm-bs-feature"><Wallet size={17}/><span><strong>Payment provider</strong><small>Not connected in this demonstration</small></span></div>
        <div className="spm-bs-feature"><CreditCard size={17}/><span><strong>Merchant payout</strong><small>Not verified · No live payment available</small></span></div>
        <Toggle label="Pay before an accepted Agreement" detail="Not permitted." checked={false} onChange={()=>{}} locked/>
        <Hint>Real payments and milestone releases require independently certified provider instructions, authority checks and reconciliation.</Hint>
      </>}
      {area==='tax' && <>
        <p className="spm-lead">Make it easier to capture the right buyer's invoice details.</p>
        <Toggle label="Ask who should appear on the invoice" detail="The customer might differ from the person buying on their behalf." checked={flags.invoiceBuyer} onChange={()=>setFlag('invoiceBuyer')}/>
        <Toggle label="Explore eTIMS connection" detail="Optional SecurePay integration, not optional legal tax compliance." checked={flags.etims} onChange={()=>setFlag('etims')}/>
        <Hint>No KRA PIN, tax record or eTIMS account is connected here.</Hint>
      </>}
      {area==='plan' && <>
        <p className="spm-lead">One Business membership, with its own clear monthly cost.</p>
        <div className="spm-bs-plan"><small>SecurePay for Business</small><strong>KSh 200 <span>/ month</span></strong><p>Proposed plan · Example only. No subscription is active or billed.</p></div>
        <div className="spm-bs-feature"><CheckCircle2 size={17}/><span><strong>For You</strong><small>Personal KSNumber plan is separate.</small></span></div>
        <Hint>Billing and activation will need separate verified confirmation.</Hint>
      </>}
      {area==='privacy' && <>
        <p className="spm-lead">Choose what is visible, and protect the people who work with you.</p>
        <Toggle label="Be listed in community directories" detail="Voluntary and subject to the community's rules." checked={flags.directory} onChange={()=>setFlag('directory')}/>
        <Toggle label="Alert me to sensitive access changes" detail="Only for a verified account and contact channel." checked={flags.alerts} onChange={()=>setFlag('alerts')}/>
        <Toggle label="Share employees' private Inbox" detail="Never automatic." checked={false} onChange={()=>{}} locked/>
        <div className="spm-bs-feature"><KeyRound size={17}/><span><strong>Connections & API</strong><small>External apps need their own scope and approval.</small></span></div>
      </>}
      <div className="spm-bs-preview-foot">
        <ShieldCheck size={16}/><span>Example preferences only. Nothing is saved, sent, accepted, published or paid.</span>
      </div>
      <button type="button" onClick={()=>setArea(null)} className="spm-secondary spm-bs-done">Back to Business Settings <ArrowRight size={16}/></button>
    </>}
  </section>;
}
