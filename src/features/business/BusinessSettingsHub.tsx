import { useState, type ReactNode } from 'react';
import {
  ArrowRight, BadgeCheck, BookOpenText, BriefcaseBusiness, Building2, Check, ChevronRight,
  CircleHelp, CreditCard, FileText, Globe2, Handshake, KeyRound, Link2, LockKeyhole,
  ReceiptText, RotateCcw, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles,
  Store, UserRoundCog, UsersRound, Wallet, X
} from 'lucide-react';

type Section = 'identity'|'team'|'store'|'network'|'ks001'|'agreements'|'checkout'|'tax'|'billing'|'privacy'|'integrations';
type BoolSetting =
  | 'allowStoreQuestions'|'includeDeliveryOptions'|'miniDiscovery'|'estateDiscovery'|'shortstaysDiscovery'
  | 'useStoreGuide'|'guideCanSuggestQuotation'|'requireBuyerReview'|'notifyForChanges'
  | 'receiptPreference'|'eTimsInterest'|'collectCorrectInvoiceRecipient'
  | 'communityDirectoryOptIn'|'publicProfileOptIn'|'accessAlerts';
type Draft = {
  businessName: string;
  description: string;
  serviceArea: string;
  businessCategory: string;
  welcomeMessage: string;
  teamKsNumber: string;
  role: 'Store editor'|'Agreement assistant'|'Read only';
} & Record<BoolSetting,boolean>;

const initial:Draft = {
  businessName:'Kamakis Traders',
  description:'Useful hardware, lighting and local deliveries',
  serviceArea:'Kamakis · Ruiru · Kiambu',
  businessCategory:'Hardware and home supplies',
  welcomeMessage:'Hello. Tell me what you need, and we will check what is available.',
  teamKsNumber:'',
  role:'Store editor',
  allowStoreQuestions:true,
  includeDeliveryOptions:true,
  miniDiscovery:true,
  estateDiscovery:false,
  shortstaysDiscovery:false,
  useStoreGuide:true,
  guideCanSuggestQuotation:true,
  requireBuyerReview:true,
  notifyForChanges:true,
  receiptPreference:false,
  eTimsInterest:false,
  collectCorrectInvoiceRecipient:true,
  communityDirectoryOptIn:false,
  publicProfileOptIn:false,
  accessAlerts:true,
};

const sections: { id:Section;title:string;subtitle:string;status:string;icon:typeof Store; group:string }[] = [
  {id:'identity',title:'Business identity',subtitle:'Who the Business is and who represents it',status:'Identity checks',icon:Building2,group:'Foundation'},
  {id:'team',title:'People & permissions',subtitle:'Invite staff and control what they may do',status:'Access control',icon:UsersRound,group:'Foundation'},
  {id:'store',title:'Store & offers',subtitle:'Catalogue, availability and delivery details',status:'Store setup',icon:ShoppingBag,group:'Sell'},
  {id:'network',title:'Store Network',subtitle:'Choose eligible communities and discovery',status:'Opt-in only',icon:Globe2,group:'Sell'},
  {id:'ks001',title:'Store Guide · KS001',subtitle:'Verified product knowledge and buyer questions',status:'Knowledge rules',icon:Sparkles,group:'Sell'},
  {id:'agreements',title:'Agreements & SecureLinks',subtitle:'Quotes, review, sharing and milestones',status:'Agreement rules',icon:Handshake,group:'Trade'},
  {id:'checkout',title:'Checkout & Money',subtitle:'Payment options, status and settlement readiness',status:'Provider gated',icon:Wallet,group:'Trade'},
  {id:'tax',title:'Invoices & eTIMS',subtitle:'Correct buyer details and optional integration',status:'Not connected',icon:ReceiptText,group:'Trade'},
  {id:'billing',title:'Plan & billing',subtitle:'Business membership and billing status',status:'Preview plan',icon:CreditCard,group:'Account'},
  {id:'privacy',title:'Privacy & security',subtitle:'Customer access, approvals and visibility',status:'Safety rules',icon:ShieldCheck,group:'Account'},
  {id:'integrations',title:'Connections & apps',subtitle:'Client sites, checkout and API access',status:'No live links',icon:Link2,group:'Account'},
];

const roles = [
  ['Business administrator','Control Business profile, roles, approval rules and permitted integrations'],
  ['Store editor','Prepare offers and confirm real stock, subject to Business permissions'],
  ['Agreement assistant','Help respond to enquiries and prepare terms, without accepting on another person’s behalf'],
  ['Read only','See only the Business records specifically authorised for their role'],
];

function Toggle({label, detail, checked, onChange, locked=false}:{
  label:string;detail:string;checked:boolean;onChange:(next:boolean)=>void;locked?:boolean;
}) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
    <div className="min-w-0"><p className="text-sm font-semibold text-[#273B2E]">{label}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p></div>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={locked}
      onClick={()=>onChange(!checked)}
      className={(checked?'bg-[#1F6244]':'bg-slate-300')+' relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60'}>
      <span className={(checked?'translate-x-5':'translate-x-0')+' absolute left-1 top-1 block h-5 w-5 rounded-full bg-white shadow transition-transform'}/>
    </button>
  </div>;
}
function Heading({title, children}: {title:string;children:ReactNode}) {
  return <div className="mb-5"><h3 className="text-xl font-semibold tracking-tight text-[#203B2C]">{title}</h3><p className="mt-1.5 text-sm leading-relaxed text-slate-600">{children}</p></div>;
}
function SmallLabel({children}:{children:ReactNode}) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#58715D]">{children}</p>;
}
function Field({label,value,onChange,maxLength=100,placeholder}:{
  label:string;value:string;onChange:(v:string)=>void;maxLength?:number;placeholder?:string
}) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#284632]">{label}</span>
    <input value={value} onChange={e=>onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder}
      className="w-full rounded-xl border border-[#DEE8DD] bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#7CA78C] focus:ring-2 focus:ring-[#CDE4D0]"/>
  </label>;
}
function Guard({children}:{children:ReactNode}) {
  return <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#D7E5DA] bg-[#F3F8F2] p-4 text-xs leading-relaxed text-[#49664C]">
    <LockKeyhole size={16} className="mt-0.5 shrink-0"/><span>{children}</span></div>;
}
function Notice({children}:{children:ReactNode}) {
  return <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{children}</p>;
}

export function BusinessSettingsHub({onOpen}:{
  onOpen:(id:'store'|'network'|'guide'|'checkout'|'tax'|'links')=>void;
}) {
  const [section,setSection]=useState<Section>('identity');
  const [draft,setDraft]=useState<Draft>({...initial});
  const [review,setReview]=useState(false);
  const [invitePreview,setInvitePreview]=useState(false);
  const [expandedRoles,setExpandedRoles]=useState(false);
  const chosen=sections.find(x=>x.id===section)!;
  const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
  const setText=(key:'businessName'|'description'|'serviceArea'|'businessCategory'|'welcomeMessage'|'teamKsNumber')=>(value:string)=>setDraft(p=>({...p,[key]:value}));
  const setSwitch=(key:BoolSetting)=>(value:boolean)=>setDraft(p=>({...p,[key]:value}));
  const pick=(id:Section)=>{setSection(id);setInvitePreview(false);setReview(false);};
  return <section className="pt-8" aria-label="Business settings control centre">
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-orange-700">Set up once · Use every day</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#19372A]">Business Settings</h1>
        <p className="mt-2 max-w-[670px] text-sm leading-relaxed text-slate-600">Your Business has its own identity, Store, people and rules. Set the foundations here so that Mini stays simple for everyday trade.</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F1E9] px-3 py-2 text-xs font-semibold text-[#256448]"><ShieldCheck size={15}/> Business controls</span>
    </div>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><SmallLabel>Business identity</SmallLabel><p className="text-sm font-semibold text-[#244C35]">Sample profile</p><p className="mt-1 text-xs text-slate-500">No verified Business KSNumber</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><SmallLabel>Connected services</SmallLabel><p className="text-sm font-semibold text-[#244C35]">Not yet connected</p><p className="mt-1 text-xs text-slate-500">No external changes possible</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><SmallLabel>Business membership</SmallLabel><p className="text-sm font-semibold text-[#244C35]">KSh 200 / month</p><p className="mt-1 text-xs text-slate-500">Business plan preview, not billed</p></div>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(300px,.83fr)_minmax(0,1.17fr)]">
      <aside className="space-y-4" aria-label="Choose Business Settings area">
        {(['Foundation','Sell','Trade','Account'] as const).map(group=><div key={group}>
          <p className="mb-2 pl-1 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">{group}</p>
          <div className="space-y-1.5">{sections.filter(s=>s.group===group).map(item=>{
            const Icon=item.icon;
            return <button key={item.id} type="button" onClick={()=>pick(item.id)} aria-current={section===item.id?'page':undefined}
              className={(section===item.id?'border-[#A6CAB0] bg-[#EBF4EB]':'border-slate-200 bg-white hover:border-[#C1D7C5] hover:bg-[#FAFCF9]')+' flex w-full items-center gap-3 rounded-xl border p-3 text-left'}>
              <span className={(section===item.id?'bg-white':'bg-[#F2F6F0]')+' flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#2A6046]'}><Icon size={20}/></span>
              <span className="min-w-0 flex-1"><strong className="block text-[13px] font-semibold text-[#243E2C]">{item.title}</strong><span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{item.subtitle}</span></span>
              <ChevronRight size={16} className="shrink-0 text-[#718D75]"/>
            </button>;
          })}</div>
        </div>)}
      </aside>
      <div>
        <div className="rounded-2xl border border-[#E0E7DF] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <p className="text-xs font-semibold text-[#1B6343]">{chosen.group} / {chosen.title}</p>
            <span className="rounded-full border border-[#E0E6DD] bg-[#F8FAF7] px-2.5 py-1.5 text-[11px] font-medium text-[#5E7862]">{chosen.status}</span>
          </div>

          {section==='identity' && <>
            <Heading title="Who customers are dealing with">A Business has its own identity, while every action is performed by a person whose authority SecurePay checks.</Heading>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" value={draft.businessName} onChange={setText('businessName')}/>
              <Field label="What you do" value={draft.businessCategory} onChange={setText('businessCategory')}/>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Where you serve customers" value={draft.serviceArea} onChange={setText('serviceArea')}/>
              <Field label="How you describe your Business" value={draft.description} onChange={setText('description')} maxLength={160}/>
            </div>
            <Guard>A Business KSNumber is issued by SecurePay after a real creation request. This example has no issued or verified Business identity. A registered company name, tax PIN and payment destination each need their own appropriate checks.</Guard>
          </>}

          {section==='team' && <>
            <Heading title="People who can act for your Business">Invite the right people and give them only the permissions they need. Being a member must never automatically grant full control.</Heading>
            <div className="rounded-xl border border-[#E1E9E0] bg-[#F8FAF7] p-4"><SmallLabel>Example owner</SmallLabel>
              <div className="flex items-start gap-3"><span className="rounded-lg bg-[#E3EFE4] p-2.5 text-[#2B684A]"><UserRoundCog size={20}/></span>
                <div><p className="text-sm font-semibold">Business administrator</p><p className="mt-1 text-xs text-slate-500">Authority shown here is illustrative. No real person or KSNumber is signed in.</p></div></div>
            </div>
            <button type="button" className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#DCE6DA] px-3 py-3 text-left text-sm font-semibold text-[#29553C]" onClick={()=>setExpandedRoles(v=>!v)} aria-expanded={expandedRoles}>
              What each role can do <ChevronRight size={17} className={expandedRoles?'rotate-90':''}/>
            </button>
            {expandedRoles && <div className="divide-y divide-slate-100 px-2">{roles.map(([name,detail])=><div key={name} className="py-3"><p className="text-xs font-semibold">{name}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{detail}</p></div>)}</div>}
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr,180px]">
              <Field label="KSNumber to invite (example only)" value={draft.teamKsNumber} onChange={setText('teamKsNumber')} maxLength={45} placeholder="Use invented details only"/>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#284632]">Proposed role</span><select value={draft.role} onChange={e=>setDraft(p=>({...p,role:e.target.value as Draft['role']}))}
                className="w-full rounded-xl border border-[#DEE8DD] bg-white px-3 py-3 text-sm">
                <option>Store editor</option><option>Agreement assistant</option><option>Read only</option></select></label>
            </div>
            <button type="button" disabled={!draft.teamKsNumber.trim()} onClick={()=>setInvitePreview(true)} className="mt-3 rounded-xl bg-[#215B41] px-4 py-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Preview invitation steps</button>
            {invitePreview && <Notice>To invite a real person, SecurePay must verify your authority, issue a scoped invitation and wait for their acceptance. No invitation was sent to {draft.teamKsNumber}. The selected example role is {draft.role}.</Notice>}
            <Guard>Protected decisions, Agreement acceptance, money access and staff administration require separately verified authority; they are not inherited from Store editing.</Guard>
          </>}

          {section==='store' && <>
            <Heading title="Keep your Store dependable">Set how customers discover your offers, what they may ask, and when availability must be confirmed.</Heading>
            <Toggle label="Allow customers to ask about your offers" detail="Questions can begin the path to a quotation, not an automatic order." checked={draft.allowStoreQuestions} onChange={setSwitch('allowStoreQuestions')}/>
            <Toggle label="Show delivery or collection choices" detail="Location, price, timing and eligibility still need confirmation for each Agreement." checked={draft.includeDeliveryOptions} onChange={setSwitch('includeDeliveryOptions')}/>
            <Toggle label="Only claim stock when it is verified" detail="This essential Store Guide rule cannot be disabled." checked onChange={()=>{}} locked/>
            <button type="button" onClick={()=>onOpen('store')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#CBDDCD] px-4 py-3 text-xs font-semibold text-[#24583D]">Explore Store offers <ArrowRight size={15}/></button>
          </>}

          {section==='network' && <>
            <Heading title="Choose where your offers may be discovered">Business participation is opt-in and subject to the receiving community or service's eligibility rules.</Heading>
            <Toggle label="SecurePay Mini" detail="Proposed preference for Mini discovery. This preview cannot publish anything." checked={draft.miniDiscovery} onChange={setSwitch('miniDiscovery')}/>
            <Toggle label="Varsityville Estate" detail="Estate-specific membership, community rules and permitted offers must be independently checked." checked={draft.estateDiscovery} onChange={setSwitch('estateDiscovery')}/>
            <Toggle label="Shortstays" detail="Only eligible, separately verified offers should appear to guests and hosts." checked={draft.shortstaysDiscovery} onChange={setSwitch('shortstaysDiscovery')}/>
            <Guard>My Ride and Storage are deliberately not auto-enabled. Sensitive categories need their own provider, product and host checks. No channel has been connected by toggling these sample preferences.</Guard>
            <button type="button" onClick={()=>onOpen('network')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#CBDDCD] px-4 py-3 text-xs font-semibold text-[#24583D]">Open Store Network overview <ArrowRight size={15}/></button>
          </>}

          {section==='ks001' && <>
            <Heading title="Let your Store Guide know what is true">KS001 should help a buyer move from a question to a worthwhile Agreement without pretending the merchant has stock or authority it doesn't have.</Heading>
            <Field label="Welcome message" value={draft.welcomeMessage} onChange={setText('welcomeMessage')} maxLength={160}/>
            <Toggle label="Offer KS001 Store guidance" detail="Sample preference only. A live Guide requires verified product knowledge and appropriate access." checked={draft.useStoreGuide} onChange={setSwitch('useStoreGuide')}/>
            <Toggle label="Help buyers request a quotation" detail="Ask for quantities, delivery area and timing; let the seller confirm what they can actually provide." checked={draft.guideCanSuggestQuotation} onChange={setSwitch('guideCanSuggestQuotation')}/>
            <Toggle label="Answers must come from verified Store facts" detail="A non-negotiable rule: no invented availability, promises or prices." checked onChange={()=>{}} locked/>
            <Guard>A Store Guide may assist with messages and structured questions, but cannot accept Agreement versions or authorize Money on the merchant's behalf.</Guard>
            <button type="button" onClick={()=>onOpen('guide')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#CBDDCD] px-4 py-3 text-xs font-semibold text-[#24583D]">View buyer-facing example <ArrowRight size={15}/></button>
          </>}

          {section==='agreements' && <>
            <Heading title="Protect the terms everyone agreed to">SecureLinks carry the current authorized record across channels. Conversations, counteroffers, approvals and work belong to the correct Agreement version.</Heading>
            <Toggle label="Require buyer review before agreement acceptance" detail="Independent acceptance is not an optional merchant shortcut; it remains enforced." checked={true} onChange={()=>{}} locked/>
            <Toggle label="Notify authorised participants when terms change" detail="Shown as a draft preference. Actual permissions and notifications come from SecurePay." checked={draft.notifyForChanges} onChange={setSwitch('notifyForChanges')}/>
            <Toggle label="Keep the accepted version immutable" detail="The agreed record remains preserved; changing obligations creates a reviewed new version." checked={true} onChange={()=>{}} locked/>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>onOpen('links')} className="rounded-xl border border-[#CBDDCD] px-3 py-3 text-xs font-semibold text-[#24583D]">SecureLink example <ArrowRight size={14} className="ml-1 inline"/></button>
              <button type="button" onClick={()=>onOpen('checkout')} className="rounded-xl border border-[#CBDDCD] px-3 py-3 text-xs font-semibold text-[#24583D]">Agreement checkout <ArrowRight size={14} className="ml-1 inline"/></button>
            </div>
          </>}

          {section==='checkout' && <>
            <Heading title="Money should follow the Agreement">A merchant may choose permitted payment methods, but provider settlement, identity checks and release instructions are independent from the Store.</Heading>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-[#F9FAF8] p-4"><SmallLabel>Payment provider</SmallLabel><p className="text-sm font-semibold">Not connected</p><p className="mt-1 text-xs text-slate-500">Certified provider dispatch required</p></div>
              <div className="rounded-xl border border-slate-200 bg-[#F9FAF8] p-4"><SmallLabel>Merchant settlement</SmallLabel><p className="text-sm font-semibold">Not verified</p><p className="mt-1 text-xs text-slate-500">No live recipient destination</p></div>
            </div>
            <Toggle label="Allow payment before an accepted Agreement" detail="Unavailable: neither the preview nor the Business may bypass this rule." checked={false} onChange={()=>{}} locked/>
            <Toggle label="Prefer showing receipts and Money status with the Agreement" detail="Preview display preference. No Money provider is connected." checked={draft.receiptPreference} onChange={setSwitch('receiptPreference')}/>
            <Guard>Provider callbacks, reconciled custody credits, staged releases and fees must be independently certified. This demonstration cannot initiate, receive or release real money.</Guard>
            <button type="button" onClick={()=>onOpen('checkout')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#CBDDCD] px-4 py-3 text-xs font-semibold text-[#24583D]">See Checkout illustration <ArrowRight size={15}/></button>
          </>}

          {section==='tax' && <>
            <Heading title="Invoices for the right buyer">The agreement should preserve who actually bought the goods or services. A trader may choose a supported invoicing integration, while legal tax obligations still apply.</Heading>
            <Toggle label="Explore connecting eTIMS" detail="Optional SecurePay integration preference, not an exemption from KRA rules." checked={draft.eTimsInterest} onChange={setSwitch('eTimsInterest')}/>
            <Toggle label="Ask who should be named on the invoice" detail="The rightful buyer or paying client may differ from the person making the purchase." checked={draft.collectCorrectInvoiceRecipient} onChange={setSwitch('collectCorrectInvoiceRecipient')}/>
            <Guard>No eTIMS API, taxpayer PIN or tax document is connected or collected in this demonstration. Legal invoice issuance, input VAT and allowable claims depend on the applicable tax rules and evidence.</Guard>
            <button type="button" onClick={()=>onOpen('tax')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#CBDDCD] px-4 py-3 text-xs font-semibold text-[#24583D]">Explore invoicing overview <ArrowRight size={15}/></button>
          </>}

          {section==='billing' && <>
            <Heading title="A clear price for the Business">The Business plan is separate from personal use of the KSNumber. Merchants should see the plan, period and what is included before any payment.</Heading>
            <div className="rounded-xl border border-[#D5E6D7] bg-[#EDF5EB] p-5"><SmallLabel>SecurePay for Business</SmallLabel>
              <p className="text-3xl font-semibold text-[#1C5037]">KSh 200 <span className="text-sm font-normal">/ month</span></p>
              <p className="mt-2 text-xs leading-relaxed text-[#4B6E50]">Business plan concept: Store controls, KS001 guidance, SecureLinks, Checkout and Living Agreement tools. This is not an active subscription.</p>
            </div>
            <div className="mt-4 divide-y divide-slate-100 text-xs">
              <div className="flex justify-between py-3"><span className="text-slate-600">Business membership</span><strong>Not activated</strong></div>
              <div className="flex justify-between py-3"><span className="text-slate-600">Next invoice</span><strong>None in this preview</strong></div>
              <div className="flex justify-between py-3"><span className="text-slate-600">Personal SecurePay for You</span><strong>Separate KSNumber plan</strong></div>
            </div>
            <Guard>Joining a plan or changing billing requires an authenticated and explicitly confirmed SecurePay action. No billing account or financial authority is created here.</Guard>
          </>}

          {section==='privacy' && <>
            <Heading title="People should control their information">Business information, customer conversations and personal records must remain separate. The merchant controls voluntary publication only within actual membership and privacy permissions.</Heading>
            <Toggle label="List the Business in a voluntary community directory" detail="Preview only: the real service needs explicit, informed consent and reciprocal visibility rules." checked={draft.communityDirectoryOptIn} onChange={setSwitch('communityDirectoryOptIn')}/>
            <Toggle label="Show a public Business profile" detail="Business-level visibility is different from revealing the owner's personal records." checked={draft.publicProfileOptIn} onChange={setSwitch('publicProfileOptIn')}/>
            <Toggle label="Alert me about sensitive access or role changes" detail="Local example preference. In production, alerts require a verified identity and delivery channel." checked={draft.accessAlerts} onChange={setSwitch('accessAlerts')}/>
            <Toggle label="Share other employees' private Inbox messages automatically" detail="Never permitted just because a person represents the same Business." checked={false} onChange={()=>{}} locked/>
            <Guard>Real audit logs, data access, consent and retention must be enforced server-side. Preview toggles do not grant authority to another KSNumber.</Guard>
          </>}

          {section==='integrations' && <>
            <Heading title="Let your Business work wherever customers are">A Business can present eligible offers through other apps and use SecurePay Checkout, KS001 and SecureLinks without losing the original Agreement record.</Heading>
            <div className="space-y-2">{[
              ['SecurePay Mini',"The person's original Mini, acting for their verified Business"],
              ['Varsityville Estate','Merchant offers under the community’s eligibility and rules'],
              ['Shortstays','Eligible guest and host services, separately vetted'],
              ['My Ride and Storage','Specialist providers and products require stronger independent verification'],
              ['Business API / Webhooks','Only applications with approved integration credentials and scope'],
            ].map(([name,detail])=><div key={name} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-[#FBFCFA] p-4">
              <div><p className="text-sm font-semibold text-[#2B4834]">{name}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p></div>
              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">Not connected</span>
            </div>)}</div>
            <Guard>Connecting an external app must not automatically authorize it to read private conversations, establish Agreements, publish offers or control Money.</Guard>
          </>}
        </div>
        <div className="mt-3 rounded-xl border border-[#DEE5DB] bg-[#F6F9F5] p-4 text-xs leading-relaxed text-[#5D715E]">
          <div className="flex items-center gap-2 font-semibold text-[#28583E]"><CircleHelp size={16}/> Demonstration controls only</div>
          <p className="mt-2">The changes you try here are held only in this page’s temporary memory. They do not connect a KSNumber, create a Business, invite staff, publish Store offers, change real security rules or move Money.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={()=>setReview(v=>!v)} className="rounded-lg border border-[#BBD2C0] bg-white px-3 py-2.5 font-semibold text-[#2B6044]">{review?'Hide':'Review'} example preferences</button>
            <button type="button" onClick={()=>{setDraft({...initial});setInvitePreview(false);setReview(false);}} className="inline-flex items-center gap-1 rounded-lg border border-[#DBE4DA] bg-white px-3 py-2.5 font-semibold text-[#536C55]"><RotateCcw size={13}/> Reset example</button>
          </div>
          {review && <div className="mt-3 rounded-lg bg-white p-3">
            <p className="font-semibold text-[#244B36]">{dirty?'You changed some example preferences.':'The sample preferences are unchanged.'}</p>
            <p className="mt-1">Business: {draft.businessName || 'Unnamed'} · Service area: {draft.serviceArea || 'Not entered'}</p>
            <p className="mt-1">Store Guide: {draft.useStoreGuide?'Preferred':'Off'} · Mini discovery: {draft.miniDiscovery?'Preferred':'Off'} · Estate: {draft.estateDiscovery?'Preferred':'Off'} · Shortstays: {draft.shortstaysDiscovery?'Preferred':'Off'}</p>
            <p className="mt-1 font-medium text-amber-900">No settings have been saved or submitted.</p>
          </div>}
        </div>
      </div>
    </div>
  </section>;
}
