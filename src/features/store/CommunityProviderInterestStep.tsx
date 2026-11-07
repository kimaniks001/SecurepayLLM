import { useEffect, useState } from 'react';
import { CheckCircle2, HeartHandshake, ShieldCheck } from 'lucide-react';
import type { StoreGateway } from '../../api/securepay/store';
import type { CommunityProviderInterestDto, CommunityProviderService } from '../../api/securepay/store/dto';

/**
 * Separate opt-in during Digital Store onboarding.
 * This is an application to be considered, NEVER a verified provider badge,
 * actual ShortStays/My Ride/Storage account, referral reward or Agreement.
 * The backend records consent under the already-authenticated KS identity.
 */
type Gateway = Pick<StoreGateway,
  'myCommunityProviderInterest' | 'saveMyCommunityProviderInterest' |
  'businessCommunityProviderInterest' | 'saveBusinessCommunityProviderInterest'>;

const policyVersion = 'community-special-provider-v1';
const services: { id: CommunityProviderService; label: string; description: string }[] = [
  { id: 'SHORTSTAYS', label: 'ShortStays', description: 'Rooms, cottages, stays and guest experiences' },
  { id: 'MY_RIDE', label: 'My Ride', description: 'Passenger transport, deliveries and cargo capacity' },
  { id: 'STORAGE', label: 'Storage', description: 'Garages, parking, warehouse bays and safe space for goods' },
];
const activeServices = (records: CommunityProviderInterestDto[]) =>
  services.filter(service => records.some(record => record.serviceType === service.id && record.status === 'INTERESTED')).map(service => service.id);

export function CommunityProviderInterestStep({gateway,businessKsNumber,storeAddressReady,onContinueWithKs001}:{
  gateway:Gateway;
  businessKsNumber:string|null;
  storeAddressReady:boolean;
  onContinueWithKs001?:(services:CommunityProviderService[])=>void;
}) {
  const [records,setRecords]=useState<CommunityProviderInterestDto[]>([]);
  const [selected,setSelected]=useState<CommunityProviderService[]>([]);
  const [agreed,setAgreed]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [skipped,setSkipped]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    let live=true;
    setError('');setNotice('');setSelected([]);setRecords([]);setAgreed(false);
    if(!storeAddressReady) {setLoading(false);return()=>{live=false;};}
    setLoading(true);
    const read=businessKsNumber
      ? gateway.businessCommunityProviderInterest(businessKsNumber)
      : gateway.myCommunityProviderInterest();
    void read.then(value=>{
      if(!live)return;
      setRecords(value);
      setSelected(activeServices(value));
    }).catch(()=>{
      if(live)setError('Could not check your community provider choices. Nothing has been changed.');
    }).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[gateway,businessKsNumber,storeAddressReady]);

  const active=activeServices(records);
  const toggle=(id:CommunityProviderService)=>{
    setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
    setAgreed(false);setNotice('');setError('');
  };
  const submit=async(withdraw=false)=>{
    if(busy || !storeAddressReady || loading)return;
    if(!withdraw&&selected.length===0){setError('Choose at least one service, or select Not now.');return;}
    if(!withdraw&&!agreed){setError('Please read and agree to the community provider commitments first.');return;}
    setError('');setNotice('');setBusy(true);
    try {
      const body={services:withdraw?[]:selected,agree:!withdraw,policyVersion:withdraw?null:policyVersion};
      const result=businessKsNumber
        ? await gateway.saveBusinessCommunityProviderInterest(businessKsNumber,body)
        : await gateway.saveMyCommunityProviderInterest(body);
      setRecords(result);setSelected(activeServices(result));
      setAgreed(false);setExpanded(false);
      setNotice(withdraw
        ? 'Your community provider interest was withdrawn. Your Digital Store is unchanged.'
        : 'Your interest was recorded under your existing KS identity. These services have not yet verified or approved you.');
    }catch{
      setError('SecurePay did not confirm this choice. It has not been saved. Please try again.');
    }finally{setBusy(false);}
  };
  return <section aria-label="Community service provider invitation" className="rounded-xl border border-cream-200 bg-cream-50 p-4 space-y-3" data-community-provider-signup>
    <header className="flex items-start gap-2">
      <HeartHandshake aria-hidden="true" size={19} className="mt-1 shrink-0 text-forest-700"/>
      <div>
        <h3 className="font-medium text-forest-800">Could you also serve your community?</h3>
        <p className="mt-1 text-xs leading-5 text-sand-700">
          If you offer accommodation, transport or storage space, you can ask to become a special community provider.
          Your Digital Store and KS Number stay the same.
        </p>
      </div>
    </header>
    {!storeAddressReady && <p className="text-xs text-sand-600">Save your Digital Store address first. You can return to this invitation whenever you wish.</p>}
    {storeAddressReady && loading && <p role="status" className="text-xs text-sand-600">Checking your existing community provider choices…</p>}
    {error && <p role="alert" className="rounded-lg bg-orange-50 p-3 text-xs text-orange-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-white p-3 text-xs text-forest-800">{notice}</p>}
    {active.length>0 && <p className="flex flex-wrap items-center gap-2 text-xs text-forest-800">
      <CheckCircle2 size={15}/> Interest recorded for {active.map(id=>services.find(s=>s.id===id)?.label).join(', ')}.
      <strong>Not yet verified.</strong>
    </p>}
    {storeAddressReady && !loading && !expanded && !skipped && <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={()=>setExpanded(true)}
        className="min-h-10 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white">
        {active.length>0?'Change my community services':'Yes, I can help'}
      </button>
      {active.length===0 && <button type="button" onClick={()=>setSkipped(true)}
        className="min-h-10 rounded-xl border border-forest-200 px-4 text-xs font-semibold text-forest-800">
        Not now
      </button>}
      {active.length>0 && <button type="button" disabled={busy} onClick={()=>void submit(true)}
        className="min-h-10 rounded-xl border border-cream-300 px-4 text-xs font-semibold text-sand-700">
        Withdraw my interest
      </button>}
    </div>}
    {skipped && <button type="button" onClick={()=>{setSkipped(false);setExpanded(true);}}
      className="min-h-10 text-xs font-semibold text-forest-700 underline">Change my mind — show the options</button>}
    {expanded && storeAddressReady && !loading && <div className="space-y-3 border-t border-cream-200 pt-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-forest-800">Which services could you provide?</legend>
        {services.map(service=><label key={service.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-200 bg-white p-3">
          <input type="checkbox" className="mt-1" checked={selected.includes(service.id)} onChange={()=>toggle(service.id)}/>
          <span className="text-xs"><strong className="block text-forest-800">{service.label}</strong><span className="text-sand-600">{service.description}</span></span>
        </label>)}
      </fieldset>
      <div className="space-y-2 rounded-xl border border-forest-200 bg-white p-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-forest-800"><ShieldCheck size={16}/> Community provider commitments</p>
        <p className="text-xs leading-5 text-sand-700">
          I will describe what I can genuinely offer, keep prices and availability clear, respect people's privacy,
          act fairly, and follow the safety, care, access and handover rules relevant to my service.
          I understand each service will review my suitability and its own additional terms before approving me.
        </p>
        <label className="flex items-start gap-2 text-xs leading-5 font-medium text-forest-800">
          <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="mt-1"/>
          I agree to apply as a special community provider for the services I selected.
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy||selected.length===0||!agreed} onClick={()=>void submit(false)}
          className="min-h-11 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white disabled:opacity-40">
          {busy?'Saving your interest…':'Submit my community provider interest'}
        </button>
        <button type="button" disabled={busy} onClick={()=>{setExpanded(false);setAgreed(false);setSelected(activeServices(records));setError('');}}
          className="min-h-11 rounded-xl border border-cream-300 px-4 text-xs text-sand-700">Cancel</button>
      </div>
    </div>}
    {active.length>0 && onContinueWithKs001 && <button type="button"
      onClick={()=>onContinueWithKs001(active)} className="min-h-10 rounded-xl border border-forest-200 bg-white px-3 text-xs font-semibold text-forest-800">
      Ask KS001 about next steps ↗
    </button>}
    <p className="text-xs leading-5 text-sand-600">
      This invitation is optional. It does not change your subscription, automatically list you as a provider,
      verify your premises or vehicle, create an Agreement, or allow payments.
    </p>
  </section>;
}
