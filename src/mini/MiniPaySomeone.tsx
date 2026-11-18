import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,CheckCircle2,Clock3,Eye,EyeOff,FileText,HandCoins,Landmark,LockKeyhole,Plus,Search,ShieldCheck,Smartphone,UsersRound,Wallet} from 'lucide-react';
import type {MiniDraft,MiniLanguage} from './miniModel';
import './miniPaySomeone.css';

type PaymentExample={id:string;title:string;payee:string;amount:number;purpose:string;due:string;status:'due'|'upcoming'|'needs-check';detail:string};
const EXAMPLES:PaymentExample[]=[
  {id:'school',title:'School fees',payee:'School account',amount:20000,purpose:'Term fees',due:'25 Nov 2026',status:'due',detail:'Accepted school payment request'},
  {id:'lpg',title:'Your cooking gas',payee:'LPG shop',amount:3000,purpose:'Monthly LPG with home delivery',due:'1 Dec 2026',status:'upcoming',detail:'Last delivery confirmed · Next month can be paid early'},
  {id:'import',title:'Imported materials',payee:'Your supplier',amount:300000,purpose:'Goods arriving in six months',due:'18 May 2027',status:'needs-check',detail:'Early payment requires the supplier to agree first'},
  {id:'plumber',title:'Kitchen sink repair',payee:'Peter · Plumber',amount:3500,purpose:'Repair of leaking kitchen sink',due:'Today',status:'due',detail:'Work acknowledged by both parties'},
  {id:'electrician',title:'Electrical repairs',payee:'John · Electrician',amount:4500,purpose:'Electrical repair work',due:'Today',status:'due',detail:'Work acknowledged by both parties'},
];
type Screen='home'|'new'|'new-review'|'detail'|'group'|'checkout'|'records'|'prepare';
const money=(n:number)=>'KSh '+n.toLocaleString('en-KE',{maximumFractionDigits:2});
const validKs=(s:string)=>/^KS[A-Z0-9-]{3,24}$/i.test(s.trim());
const validAmount=(s:string)=>/^(?:[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(s.trim())&&Number(s)>0;
const header=(title:string,sub:string)=><div className="spm-pay-heading"><h1>{title}</h1><p>{sub}</p></div>;

/**
 * Payment human layer. No new money API, provider execution, receivable
 * balances, recipient acceptance or guessed account authority is created here.
 * Fictional walkthrough is only available on the explicitly guarded Mini
 * playground. Real work goes to the existing first-party Agreement gateway.
 */
export function MiniPaySomeone({language,preview,seed,onBack,onExisting,onPrepareNew,canOpenExisting}:{
  language:MiniLanguage;preview:boolean;seed:string;onBack:()=>void;
  onExisting:()=>void;onPrepareNew:(draft:MiniDraft)=>void;canOpenExisting:boolean;
}) {
  const sw=language==='sw';
  const [screen,setScreen]=useState<Screen>('home');
  const [filter,setFilter]=useState<'all'|'due'|'upcoming'>('all');
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<string[]>([]);
  const [focused,setFocused]=useState('lpg');
  const [ks,setKs]=useState('');
  const [amount,setAmount]=useState('');
  const [purpose,setPurpose]=useState(seed.slice(0,400));
  const [rail,setRail]=useState('M-PESA');
  const [plan,setPlan]=useState('Set money aside');
  const [privacyRevealed,setPrivacyRevealed]=useState(false); // in-memory only, reset when Mini reopens
  const focusedItem=EXAMPLES.find(i=>i.id===focused)||EXAMPLES[0];
  const picked=EXAMPLES.filter(i=>selected.includes(i.id));
  const total=useMemo(()=>picked.reduce((sum,i)=>sum+i.amount,0),[picked]);
  const available=EXAMPLES.filter(i=>i.status==='due');
  const query=search.trim().toLocaleLowerCase('en-KE');
  const list=EXAMPLES.filter(i=>(filter==='all'||(filter==='due'?i.status==='due':i.status!=='due'))&&
    (!query||[i.title,i.payee,i.purpose,i.due].some(v=>v.toLocaleLowerCase('en-KE').includes(query))));
  const back=()=>{
    if(screen==='home')onBack();
    else if(screen==='checkout')setScreen('group');
    else if(screen==='new-review')setScreen('new');
    else {setPrivacyRevealed(false);setFilter('all');setScreen('home');}
  };
  const makeDraft=():MiniDraft=>({intent:'pay',description:purpose.trim(),amount:amount.trim(),
    counterparty:ks.trim().toUpperCase(),note:'Proposed payee KSNumber: '+ks.trim().toUpperCase()+'. Recipient must accept the stated purpose and amount before the payer can authorise Money.',
    quantity:'',unit:''});
  return <section className="spm-pay spm-content" aria-label="Pay someone or something">
    <div className="spm-pay-private-heading"><button type="button" className="spm-back" onClick={back}><ArrowLeft size={17}/>{sw?'Rudi':'Back'}</button>
      {preview&&['home','detail','group','checkout','records','prepare'].includes(screen)&&
        <button type="button" className="spm-pay-privacy-control"
          onClick={()=>setPrivacyRevealed(v=>!v)} aria-label={privacyRevealed?'Hide payment amounts':'Show payment amounts'}>
          {privacyRevealed?<EyeOff size={16}/>:<Eye size={16}/>}{privacyRevealed?'Hide amounts':'Show amounts'}</button>}
    </div>
    {screen==='home'&&<>
      {header(sw?'Malipo yako':'Your payments',sw?'Lipa mtu au kitu kwa urahisi.':'Find someone or something you agreed to pay.')}
      {preview&&<div className="spm-pay-demo-note"><strong>Example payments only</strong><small>Fictional people and amounts. No requests or money are sent.</small></div>}
      {preview&&<>
        <label className="spm-pay-search" htmlFor="spm-pay-find"><Search size={17}/>
          <input id="spm-pay-find" type="search" value={search} onChange={e=>setSearch(e.target.value)}
            autoComplete="off" placeholder="Find a person, shop or item" aria-label="Find a payment by person, shop or item"/>
        </label>
        <div className="spm-pay-tabs" role="group" aria-label="Filter payments">
          {(['all','due','upcoming'] as const).map(x=><button key={x} type="button"
            aria-pressed={filter===x} onClick={()=>setFilter(x)}>{x==='all'?'All':x==='due'?'To review':'Later'}</button>)}
        </div>
        <div className="spm-pay-items">
          {list.map(i=><button type="button" className="spm-pay-item" key={i.id}
            onClick={()=>{setFocused(i.id);setPrivacyRevealed(true);setScreen('detail')}}>
            <span className="spm-pay-avatar"><FileText size={18}/></span>
            <span className="spm-pay-item-text"><strong>{i.title}</strong>
              <small>{i.payee}</small>{privacyRevealed&&<small>{i.due} · {i.status==='due'?'To review':i.status==='needs-check'?'Check terms':'Later'}</small>}</span>
            <span className="spm-pay-item-value">{privacyRevealed?money(i.amount):<LockKeyhole size={15} aria-label="Amount hidden"/>}<ArrowRight size={15}/></span>
          </button>)}
        </div>
        {list.length===0&&<p className="spm-pay-note">No matching payments. Try a name, shop or item.</p>}
        <button type="button" className="spm-secondary spm-pay-full" onClick={()=>{setSelected(available.map(i=>i.id));setPrivacyRevealed(true);setScreen('group')}}>
          <UsersRound size={17}/>Pay several people <ArrowRight size={17}/>
        </button>
      </>}
      {!preview&&<div className="spm-pay-live">
        <Wallet size={24}/>
        <strong>See what you've agreed to pay</strong>
        <p>Your accepted agreements and their latest payment information are kept with your SecurePay account.</p>
        <button type="button" className="spm-primary" onClick={onExisting} disabled={!canOpenExisting}>
          Open my agreements <ArrowRight size={17}/></button>
        <small>{canOpenExisting?'Only verified server records are shown. A payment is not marked due or paid without confirmation.':'Your live Agreement connection is unavailable here. No amounts or payment statuses are being guessed.'}</small>
      </div>}
      <button type="button" className="spm-primary spm-pay-full" onClick={()=>setScreen('new')}>
        <Plus size={18}/>Pay someone new <ArrowRight size={17}/>
      </button>
    </>}
    {screen==='new'&&<>
      {header('Pay someone new','Who are you paying, how much, and what for?')}
      <label className="spm-label" htmlFor="spm-pay-ks">Their KSNumber</label>
      <input id="spm-pay-ks" className="spm-field" value={ks} onChange={e=>setKs(e.target.value)}
        placeholder="e.g. KS00245" autoComplete="off" maxLength={26}/>
      <small className="spm-pay-note">Their identity must be checked by SecurePay before sending a real request.</small>
      <label className="spm-label" htmlFor="spm-pay-amount">Amount in KSh</label>
      <input id="spm-pay-amount" className="spm-field" value={amount} onChange={e=>setAmount(e.target.value)}
        placeholder="e.g. 3500" inputMode="decimal" maxLength={12}/>
      <label className="spm-label" htmlFor="spm-pay-purpose">What's the payment for?</label>
      <div className="spm-pay-pills">
        {['Work completed','Family support','Repayment','Goods or services'].map(s=>
          <button type="button" key={s} onClick={()=>setPurpose(s)}>{s}</button>)}
      </div>
      <textarea id="spm-pay-purpose" className="spm-field" rows={3} maxLength={400}
        value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="e.g. Repair of leaking kitchen sink"/>
      <p className="spm-pay-note">The other person will review and agree to this purpose and amount before you can authorise payment.</p>
      <button type="button" className="spm-primary" disabled={!validKs(ks)||!validAmount(amount)||!purpose.trim()}
        onClick={()=>setScreen('new-review')}>Review payment <ArrowRight size={17}/></button>
    </>}
    {screen==='new-review'&&<>
      {header('Does this look right?','The other person must agree before you pay.')}
      <div className="spm-pay-review">
        <small>Paying</small><strong>{ks.trim().toUpperCase()} · Not yet verified</strong>
        <small>Amount</small><b>{money(Number(amount))}</b>
        <small>Reason</small><strong>{purpose.trim()}</strong>
      </div>
      {preview?<div className="spm-pay-live"><Clock3 size={24}/><strong>Awaiting their agreement</strong>
          <p>In the real Mini, the recipient would see this request, and could agree, decline or ask for a correction.</p>
          <small>Nothing has been sent in this example.</small>
          <button type="button" className="spm-secondary" onClick={()=>setScreen('home')}>Back to your payments</button>
        </div>
        :<><p className="spm-pay-note">Continue in SecurePay to review identity and form the real agreement. This note alone does not send a request.</p>
          <button type="button" className="spm-primary" onClick={()=>onPrepareNew(makeDraft())}>Continue to SecurePay <ArrowRight size={17}/></button></>}
    </>}
    {screen==='detail'&&preview&&<>
      {!privacyRevealed?<div className="spm-pay-private-cover"><LockKeyhole size={20}/><strong>Private agreement</strong><p>Tap Show to see the amount and purpose.</p><button type="button" className="spm-secondary" onClick={()=>setPrivacyRevealed(true)}>Show details</button></div>:<>
      {header(focusedItem.title,focusedItem.payee)}
      <div className="spm-pay-review"><small>Agreed amount</small><b>{money(focusedItem.amount)}</b>
        <small>For</small><strong>{focusedItem.purpose}</strong>
        <small>Payment date</small><strong>{focusedItem.due}</strong></div>
      <p className="spm-pay-note"><CheckCircle2 size={16}/> {focusedItem.detail}</p>
      {focusedItem.status==='due'?<button type="button" className="spm-primary" onClick={()=>{setSelected([focusedItem.id]);setScreen('group')}}>Review & pay <ArrowRight size={17}/></button>:
      focusedItem.status==='upcoming'?<button type="button" className="spm-primary" onClick={()=>{setSelected([focusedItem.id]);setScreen('group')}}>Pay ahead of time <ArrowRight size={17}/></button>:
      <p className="spm-pay-note">The supplier must first agree to early payment. This is not yet payable.</p>}
      <button type="button" className="spm-secondary spm-pay-full" onClick={()=>setScreen('prepare')}><CalendarDays size={17}/>Help me prepare</button>
      </>}
    </>}
    {screen==='group'&&preview&&<>
      {header('Who would you like to pay?','Choose the people whose payments you want to settle.')}
      <div className="spm-pay-items">
      {EXAMPLES.filter(i=>i.status!=='needs-check').map(i=><label key={i.id} className="spm-pay-choose">
        <input type="checkbox" checked={selected.includes(i.id)} onChange={e=>setSelected(p=>e.target.checked?[...p,i.id]:p.filter(x=>x!==i.id))}/>
        <span><strong>{privacyRevealed?i.payee:'Person'}</strong><small>{privacyRevealed?`${i.purpose} · ${i.due}`:'Private payment'}</small></span><b>{privacyRevealed?money(i.amount):'••••'}</b>
      </label>)}
      </div>
      <div className="spm-pay-total"><span>{privacyRevealed?`${picked.length} selected`:'Selected payments'}</span><strong>{privacyRevealed?money(total):'••••'}</strong></div>
      <p className="spm-pay-note">Each person keeps their own accepted agreement and payment record. One person's failure must never mark the others paid.</p>
      {!privacyRevealed&&<p className="spm-pay-note">Show details before you review who receives each payment.</p>}
      <button type="button" className="spm-primary" disabled={!picked.length||!privacyRevealed}
        onClick={()=>setScreen('checkout')}>Review payments <ArrowRight size={17}/></button>
    </>}
    {screen==='checkout'&&preview&&<>
      {!privacyRevealed?<div className="spm-pay-private-cover"><LockKeyhole size={19}/><strong>Payment details hidden</strong><p>Tap Show to review people and amounts.</p></div>:<>
      {header('Review your payments','Nothing moves until you authorise it.')}
      <div className="spm-pay-review">
        {picked.map(i=><div className="spm-pay-checkrow" key={i.id}><span>{i.payee}<small>{i.purpose}</small></span><strong>{money(i.amount)}</strong></div>)}
        <div className="spm-pay-total"><span>Total</span><strong>{money(total)}</strong></div>
      </div>
      <strong>How would you like to pay?</strong>
      <div className="spm-pay-rails">{[{name:'M-PESA',icon:Smartphone},{name:'PesaLink',icon:HandCoins},{name:'Choice Bank',icon:Landmark}].map(({name,icon:Glyph})=><button key={name} type="button" aria-pressed={rail===name}
          onClick={()=>setRail(name)}><Glyph size={17}/>{name}{rail===name&&<CheckCircle2 size={16}/>}</button>)}</div>
      <p className="spm-pay-note"><ShieldCheck size={15}/>Real payment instructions remain disabled here. Providers may require separate approvals for several payments.</p>
      <button type="button" className="spm-primary" onClick={()=>setScreen('records')}>View sample payment records <ArrowRight size={17}/></button>
      </>}
    </>}
    {screen==='records'&&preview&&<>
      {!privacyRevealed?<div className="spm-pay-private-cover"><LockKeyhole size={19}/><strong>Private payment records</strong><p>Tap Show to inspect individually.</p></div>:<>
      {header('Your payment records','How individual receipts will appear after provider confirmation.')}
      <div className="spm-pay-review">{picked.map(i=><div key={i.id} className="spm-pay-checkrow">
        <span><strong>{i.payee}</strong><small>{i.purpose} · Not sent</small></span><strong>{money(i.amount)}</strong></div>)}</div>
      <p className="spm-pay-demo-note">Example only: no money moved and none of these people was marked paid.</p>
      <button type="button" className="spm-secondary" onClick={()=>setScreen('home')}>Back to your payments</button>
      </>}
    </>}
    {screen==='prepare'&&preview&&<>
      {!privacyRevealed?<div className="spm-pay-private-cover"><LockKeyhole size={19}/><strong>Private payment planning</strong><p>Tap Show to view this expense.</p></div>:<>
      {header('Get ready for this payment','You can plan ahead without paying the other person today.')}
      <div className="spm-pay-review"><small>Coming up</small><b>{money(focusedItem.amount)}</b><small>When</small><strong>{focusedItem.due}</strong></div>
      <div className="spm-pay-rails">{['Set money aside','Pay gradually','Ask about financing','Arrange regular payments'].map(s=>
        <button type="button" key={s} aria-pressed={plan===s} onClick={()=>setPlan(s)}>{s}{plan===s&&<CheckCircle2 size={16}/>}</button>)}</div>
      <p className="spm-pay-note">In the real app, an eligible regulated provider would explain the terms and request your approval. Nothing is invested or borrowed here.</p>
      <button type="button" className="spm-secondary" onClick={()=>setScreen('home')}>Back to your payments</button>
      </>}
    </>}
  </section>;
}
