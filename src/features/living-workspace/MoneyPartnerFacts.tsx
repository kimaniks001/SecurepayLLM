import { useEffect, useState } from 'react';
import type { FinancialPartnerGateway, RegulatedPartnerResponse } from '../../api/securepay/financial-partners';

/** Institutional directory facts only, never a lender recommendation,
 * licensing determination, available offer or credit/insurance decision. */
export function MoneyPartnerFacts({gateway,enabled,focus}:{gateway?:Pick<FinancialPartnerGateway,'list'>;
  enabled:boolean;focus:'borrow'|'invest'|'protect';
}) {
  const [open,setOpen]=useState(false);
  const [status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [partners,setPartners]=useState<RegulatedPartnerResponse[]>([]);
  useEffect(()=>{
    if(!enabled||!gateway||!open){setPartners([]);setStatus('idle');return;}
    let active=true;setPartners([]);setStatus('loading');
    void gateway.list().then(result=>{
      if(!active)return;
      setPartners(result.filter(p=>!!p.id && !!p.displayName));
      setStatus('ready');
    }).catch(()=>{if(active){setPartners([]);setStatus('error');}});
    return()=>{active=false;};
  },[enabled,gateway,open,focus]);
  const purpose={borrow:'finance',invest:'savings or investment',protect:'insurance or protection'}[focus];
  return <section data-phase7-partners className="rounded-xl border border-cream-200 bg-white p-3">
    <button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}
      className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-xs font-semibold text-forest-800">
      View participating institutions <span aria-hidden="true">{open?'−':'+'}</span>
    </button>
    {open&&<div className="space-y-2 pt-2">
      <p className="text-xs leading-5 text-sand-600">SecurePay may list regulated partner records.
        A catalogue entry is not an approved {purpose} offer, a rate, eligibility or confirmed institution for your Agreement.</p>
      {!enabled&&<p className="text-xs text-sand-600">Sign in to check the authorised institution directory.</p>}
      {enabled&&!gateway&&<p className="text-xs text-sand-600">Institution information is unavailable in this preview.</p>}
      {status==='loading'&&<p role="status" className="text-xs">Checking authorised institution records…</p>}
      {status==='error'&&<p role="alert" className="text-xs">Institution records could not be verified. No offers are being claimed.</p>}
      {status==='ready'&&partners.length===0&&<p className="text-xs">No institution records were returned for review.</p>}
      {status==='ready'&&partners.slice(0,6).map(partner=><article key={partner.id}
        className="rounded-xl bg-cream-50 p-3 space-y-1">
        <p className="text-sm font-semibold text-forest-900">{partner.displayName}</p>
        <p className="text-xs text-sand-600">{partner.partnerType} · {partner.environment} · Recorded status: {partner.status}</p>
        {partner.capabilities.length>0&&
          <p className="text-xs text-sand-700">Catalogue capabilities: {partner.capabilities
            .filter(c=>c.enabled).map(c=>c.capability+' ('+c.currency+')').join(', ')||'None marked enabled'}</p>}
        <p className="text-xs text-sand-600">Separate institution terms and suitability confirmation required.</p>
      </article>)}
    </div>}
  </section>;
}
