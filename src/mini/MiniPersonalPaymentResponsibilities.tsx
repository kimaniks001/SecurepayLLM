import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Eye,EyeOff,FileText,LockKeyhole,RefreshCcw,Search,ShieldCheck} from 'lucide-react';
import type {PersonalPaymentResponsibilitiesGateway,PersonalPaymentResponsibility} from '../api/securepay/personal-payments';
import './miniPersonalPaymentResponsibilities.css';

const stateText=(s:PersonalPaymentResponsibility['agreementState'])=>{
  switch(s){
    case 'NEEDS_YOUR_AGREEMENT':return 'Review and agree';
    case 'WAITING_FOR_OTHER_PERSON':return 'Waiting for the other person';
    case 'AGREED_PAYMENT_CHECK_PENDING':return 'Agreed — checking payment details';
    case 'CLOSED_NO_PAYMENT_INFERENCE':return 'Work closed — check payment record';
  }
};
const statusClass=(s:PersonalPaymentResponsibility['agreementState'])=>
  s==='NEEDS_YOUR_AGREEMENT'?'amber':s==='AGREED_PAYMENT_CHECK_PENDING'?'blue':'neutral';
const money=(minor:number,currency:string)=>
  `${currency} ${(minor/100).toLocaleString('en-KE',{minimumFractionDigits:0,maximumFractionDigits:2})}`;

/**
 * Phase 2B — read-only owner-scoped responsibilities.
 * Default is a shoulder-surfing safe neutral cover. No amount/party/status
 * appears until the user explicitly reveals it in THIS mount. No storage.
 * The API is not a "due" or "payable" authority and no transfer can start.
 */
export function MiniPersonalPaymentResponsibilities({gateway,prepare,onBack,onViewAgreements}:{
  gateway:PersonalPaymentResponsibilitiesGateway;prepare:()=>Promise<unknown>;
  onBack:()=>void;onViewAgreements:()=>void;
}){
  const [rows,setRows]=useState<PersonalPaymentResponsibility[]>([]);
  const [page,setPage]=useState(0);
  const [more,setMore]=useState(false);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [error,setError]=useState('');
  const [reveal,setReveal]=useState(false);
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const alive=useRef(true);
  const busy=useRef(false);

  const load=async(next:number,replace:boolean)=>{
    if(busy.current)return;
    busy.current=true;
    if(replace){setStatus('loading');setRows([]);setPage(0);setSelected(null);setError('');}
    try {
      await prepare();
      const response=await gateway.read(next,20);
      if(!alive.current)return;
      setRows(previous=>{
        if(replace)return response.items;
        const seen=new Set(previous.map(r=>r.agreementId+':'+r.obligationId));
        if(response.items.some(r=>seen.has(r.agreementId+':'+r.obligationId))){
          setError('The agreements changed. Refresh before continuing.');
          setMore(false);
          return previous;
        }
        return [...previous,...response.items];
      });
      setPage(next);
      // The backend pages authorized Agreements, not rows: empty response rows
      // do not mean pagination is complete.
      setMore((next+1)*response.size<response.totalAgreementCandidates);
      setStatus('ready');
    }catch{
      if(!alive.current)return;
      setError('Your agreements could not be checked. No payment information has been assumed.');
      if(replace)setStatus('error');
    }finally{busy.current=false;}
  };
  useEffect(()=>{
    alive.current=true;
    void load(0,true);
    return()=>{alive.current=false;};
    // Authenticated gateway identity must remain stable for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gateway]);

  const chosen=rows.find(r=>r.obligationId===selected)||null;
  const needle=search.trim().toLocaleLowerCase('en-KE');
  const filteredRows=rows.filter(r=>!needle||[r.agreementTitle,r.obligationTitle,r.purpose]
    .some(value=>value.toLocaleLowerCase('en-KE').includes(needle)));
  const privacy=<button type="button" className="spm-payment-privacy-toggle"
    onClick={()=>setReveal(x=>!x)}
    aria-label={reveal?'Hide amounts and payment details':'Show amounts and payment details'}>
    {reveal?<EyeOff size={17}/>:<Eye size={17}/>}
    {reveal?'Hide amounts':'Show amounts'}
  </button>;

  return <section className="spm-payer-responsibilities" aria-label="My private payment responsibilities">
    <div className="spm-payment-title-row">
      <button type="button" className="spm-back" onClick={selected?()=>{setSelected(null);setReveal(false);}:onBack}>
        <ArrowLeft size={17}/>{selected?'Your agreements':'Back to payments'}
      </button>
      {privacy}
    </div>
    <h2>{selected?'Your agreement':'Your payment agreements'}</h2>
    <p className="spm-payment-soft">Find an agreement. Amounts and payment details stay hidden until you open it.</p>
    {status==='loading'&&<p role="status">Checking your agreements…</p>}
    {error&&<p role="alert">{error}</p>}
    {status==='error'&&<button type="button" className="spm-secondary" onClick={()=>void load(0,true)}>
      <RefreshCcw size={15}/>Try again</button>}
    {status==='ready'&&chosen&&<>
      {!reveal?<button type="button" className="spm-payment-covered-item"
        onClick={()=>setReveal(true)}><LockKeyhole size={19}/> Tap to view this agreement privately <Eye size={16}/></button>
      :<div className="spm-payment-private-detail">
        <div className="spm-payment-detail-name">{chosen.obligationTitle}<small>{chosen.agreementTitle}</small></div>
        <div className="spm-payment-detail-amount">
          <small>{chosen.amountMeaning==='AGREED'?'Amount agreed':'Amount proposed'}</small>
          <strong>{money(chosen.statedAmountMinor,chosen.currency)}</strong>
          <small>This is not a verified unpaid balance.</small>
        </div>
        <p>{chosen.purpose}</p>
        <div className="spm-payment-state-detail" data-workflow={statusClass(chosen.agreementState)}>
          <FileText size={16}/>
          <span>{stateText(chosen.agreementState)}</span>
        </div>
        <p className="spm-payment-soft">The payment amount, timing and provider result still need independent confirmation. No money can be moved from this screen.</p>
        <button type="button" className="spm-secondary" onClick={onViewAgreements}>Open full Agreement <ArrowRight size={15}/></button>
      </div>}
    </>}
    {status==='ready'&&!selected&&<>
      <label htmlFor="spm-personal-pay-search" className="spm-pay-search"><Search size={17}/>
        <input type="search" id="spm-personal-pay-search" value={search}
          onChange={e=>setSearch(e.target.value)} autoComplete="off"
          placeholder="Find by shop, person or item" aria-label="Find an agreement"/>
      </label>
      {rows.length===0&&<p className="spm-payment-soft">No personal payment responsibilities were returned on this page. That does not prove nothing is owed.</p>}
      {rows.length>0&&filteredRows.length===0&&<p className="spm-payment-soft">No matches in the agreements loaded. Try another term or load more.</p>}
      <div className="spm-payment-responsibility-list">
        {filteredRows.map(item=><button key={item.agreementId+':'+item.obligationId}
          type="button" className="spm-payment-responsibility-item"
          onClick={()=>{setSelected(item.obligationId);setReveal(true);}}>
          <span className="spm-payment-row-symbol"><FileText size={17}/></span>
          <span className="spm-payment-row-copy">
            <strong>{item.obligationTitle}</strong>
            <small>{reveal?stateText(item.agreementState):item.agreementTitle}</small>
          </span>
          {reveal&&<span className="spm-payment-detailed-signal" data-workflow={statusClass(item.agreementState)} aria-hidden="true"/>}
          <ArrowRight size={17}/>
        </button>)}
      </div>
      {more&&<button type="button" className="spm-secondary"
        disabled={busy.current} onClick={()=>void load(page+1,false)}>See more agreements</button>}
      <button type="button" className="spm-secondary" onClick={()=>void load(0,true)}>
        <RefreshCcw size={15}/>Refresh</button>
    </>}
    <div className="spm-payment-footer-note"><ShieldCheck size={16}/>
      <span>Your information is private. An Agreement's workflow colour never represents your financial standing.</span>
    </div>
    <button type="button" className="spm-quiet-button" onClick={onViewAgreements}>View all my Agreements</button>
  </section>;
}
