import { useState, type FormEvent } from 'react';
import { CalendarDays, MapPin, Users, Wallet } from 'lucide-react';

export type MiniKind = 'date'|'money'|'person'|'place'|'text';
export function kindForDetail(label: string): MiniKind {
  if(/when|date|deadline|time|schedule|deliver.*day|commenc|completion/i.test(label))return 'date';
  if(/money|price|amount|cost|budget|payment|deposit|balance/i.test(label))return 'money';
  if(/who|people|person|party|supplier|buyer|seller|responsib/i.test(label))return 'person';
  if(/where|place|location|address|site|destination|entrance/i.test(label))return 'place';
  return 'text';
}
export function MiniContextInput({kind,label,initialValue='',onSubmit,onCancel,onDraftChange}:{
  kind:MiniKind;label:string;initialValue?:string;
  onSubmit:(value:string)=>Promise<void>;onCancel:()=>void;onDraftChange?:(value:string)=>void;
}){
  const initial = kind==='date' && !/^\d{4}-\d{2}-\d{2}$/.test(initialValue) ? ''
    : kind==='money' && !/^\d+(?:\.\d+)?$/.test(initialValue) ? '' : initialValue;
  const [value,setValue]=useState(initial);
  const [currency,setCurrency]=useState('KES');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(busy)return;
    const trimmed=value.trim();
    if(!trimmed){setError('Please enter a value, or cancel.');return;}
    if(kind==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)){setError('Choose a valid date.');return;}
    if(kind==='money'&&(!Number.isFinite(Number(trimmed))||Number(trimmed)<0)){setError('Enter a valid non-negative amount.');return;}
    setBusy(true);setError(null);
    try {
      await onSubmit(kind==='money'?currency+' '+trimmed:trimmed);
    } catch {
      setError('KS001 has not confirmed that information. Check the conversation before trying again.');
    } finally {setBusy(false);}
  };
  const Icon=kind==='date'?CalendarDays:kind==='money'?Wallet:kind==='person'?Users:MapPin;
  return <form onSubmit={event=>void submit(event)} aria-label={'Enter '+label} data-mini-context-kind={kind}
    className="space-y-3 rounded-xl border border-forest-200 bg-white p-3 shadow-sm">
    <label className="block text-xs font-semibold text-forest-800">
      <span className="inline-flex items-center gap-2"><Icon size={16}/> {label}</span>
      <div className="mt-2 flex gap-2">
        {kind==='money'&&<select aria-label="Currency" value={currency} onChange={event=>setCurrency(event.target.value)}
          className="min-h-11 rounded-lg border border-cream-200 bg-white px-2 text-sm">
          <option value="KES">KES</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
        </select>}
        <input autoFocus type={kind==='date'?'date':kind==='money'?'number':'text'}
          min={kind==='money'?'0':undefined} step={kind==='money'?'0.01':undefined}
          aria-label={'Value for '+label} value={value} onChange={event=>{setValue(event.target.value);onDraftChange?.(event.target.value);}}
          placeholder={kind==='person'?'Name and role':kind==='place'?'Address, entrance or Plus Code':kind==='money'?'Amount':'What should it say?'}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-forest-900"/>
      </div>
    </label>
    {kind==='date'&&<p className="text-xs text-sand-600">Choose the date. Add a time, range or condition through the Date & Time tool.</p>}
    {kind==='money'&&<p className="text-xs text-sand-600">This proposes an amount to KS001; it does not fund or release money.</p>}
    {error&&<p role="alert" className="text-xs text-amber-900">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={busy||!value.trim()} className="min-h-11 rounded-lg bg-forest-800 px-4 text-xs font-semibold text-white disabled:opacity-40">{busy?'Checking…':'Send to KS001'}</button>
      <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-lg border border-cream-200 px-4 text-xs">Cancel</button>
    </div>
  </form>;
}
