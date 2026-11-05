import { useState } from 'react';
import type { EmbedOwnerGateway, EmbedOwnerStatus, EmbedLimits } from '../../api/securepay/embed';

/** Signed-in SecurePay Settings only. Never mounted inside a third-party guest widget. */
export function EmbedOwnerSettings({gateway}:{gateway:EmbedOwnerGateway}) {
  const [siteId,setSiteId]=useState('');
  const [status,setStatus]=useState<EmbedOwnerStatus|null>(null);
  const [draft,setDraft]=useState<EmbedLimits|null>(null);
  const [name,setName]=useState('');
  const [origin,setOrigin]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const load=async()=>{
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      const s=await gateway.get(siteId.trim());
      setStatus(s);
      const {enabled,dailyTurnLimit,monthlyTurnLimit,visitorDailyLimit}=s.installation;
      setDraft({enabled,dailyTurnLimit,monthlyTurnLimit,visitorDailyLimit});
    }catch{
      setStatus(null);setDraft(null);
      setError('No installation belonging to your SecurePay identity was found. You can register a sandbox installation below.');
    }finally{setBusy(false);}
  };
  const register=async()=>{
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      await gateway.register({siteId:siteId.trim(),displayName:name.trim(),allowedOrigin:origin.trim()});
      const s=await gateway.get(siteId.trim());
      setStatus(s);
      const {enabled,dailyTurnLimit,monthlyTurnLimit,visitorDailyLimit}=s.installation;
      setDraft({enabled,dailyTurnLimit,monthlyTurnLimit,visitorDailyLimit});
      setNotice('Sandbox installation registered. AI assistance remains switched off until you approve a budget.');
    }catch{setError('Registration was not approved. Confirm your signed-in KS identity, exact HTTPS origin and sandbox permissions.');}
    finally{setBusy(false);}
  };
  const save=async()=>{
    if(!draft||!status||busy)return;
    if(![draft.dailyTurnLimit,draft.monthlyTurnLimit,draft.visitorDailyLimit]
      .every(Number.isInteger)){setError('Enter whole-number limits.');return;}
    setBusy(true);setError('');setNotice('');
    try {
      const updated=await gateway.update(status.installation.siteId,draft);
      setStatus(updated);setNotice('SecurePay has saved these limits on its backend.');
    }catch{setError('Could not update this installation. Its previous limits remain authoritative.');}
    finally{setBusy(false);}
  };
  return <section aria-label="SecurePay website tools and AI limits" className="rounded-xl border border-cream-200 bg-white p-4 space-y-3 text-sm">
    <div className="font-semibold text-forest-800">Website tools · KS001 spending protection</div>
    <p className="text-xs text-sand-600">Manage only installations owned by your signed-in KS identity. Figures measure sponsored AI turns, not money or model-token fees. This sandbox programme cannot activate production payments.</p>
    <label className="block text-xs text-sand-600" htmlFor="embed-site-id">Installation ID</label>
    <div className="flex gap-2">
      <input id="embed-site-id" value={siteId} onChange={e=>{setSiteId(e.target.value);setStatus(null);setDraft(null);}} placeholder="Your authorised site ID" maxLength={64} className="min-w-0 flex-1 rounded-lg border border-cream-200 p-2"/>
      <button type="button" disabled={busy||!siteId.trim()} onClick={()=>void load()} className="rounded-lg bg-forest-700 px-3 py-2 text-white disabled:opacity-50">Open</button>
    </div>
    {status&&draft?
      <div className="space-y-3">
        <p className="font-medium text-forest-800">{status.installation.displayName}</p>
        <p className="text-xs text-sand-600">Approved website origin: {status.installation.allowedOrigin}</p>
        <p className="text-xs">Today: <strong>{status.todayUsed}/{draft.dailyTurnLimit}</strong> sponsored turns · This month: <strong>{status.monthUsed}/{draft.monthlyTurnLimit}</strong></p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.enabled} onChange={e=>setDraft(s=>s?{...s,enabled:e.target.checked}:s)}/>
          Sponsor customer KS001 questions
        </label>
        {([
          ['dailyTurnLimit','Daily maximum',1000],
          ['monthlyTurnLimit','Monthly maximum',30000],
          ['visitorDailyLimit','Per visitor, per day',100]
        ] as const).map(([key,label,max])=>
          <label key={key} className="flex items-center justify-between gap-3 text-xs">
            <span>{label}</span>
            <input type="number" min={0} max={max} step={1} value={draft[key]}
              onChange={e=>setDraft(s=>s?{...s,[key]:e.target.valueAsNumber}:s)}
              className="w-24 rounded-lg border border-cream-200 p-2"/>
          </label>)}
        <button disabled={busy} type="button" onClick={()=>void save()} className="rounded-lg bg-forest-700 px-4 py-2 text-white disabled:opacity-50">{busy?'Saving…':'Save AI limits'}</button>
      </div>:
      <div className="space-y-2">
        <p className="text-xs text-sand-600">Register a new sandbox installation only when its owner and origin have been approved by SecurePay.</p>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Store / community name" maxLength={120} className="w-full rounded-lg border border-cream-200 p-2"/>
        <input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="https://approved-site.example" className="w-full rounded-lg border border-cream-200 p-2"/>
        <button type="button" disabled={busy||!siteId.trim()||!name.trim()||!origin.trim()} onClick={()=>void register()} className="rounded-lg border border-forest-700 px-3 py-2 text-forest-800 disabled:opacity-50">Register sandbox tool</button>
      </div>}
    {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
    {notice&&<p role="status" className="text-xs text-forest-700">{notice}</p>}
  </section>;
}
