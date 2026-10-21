import { useState, type FormEvent } from 'react';
import { CalendarDays, CheckCircle2 } from 'lucide-react';

/** Timing is a proposal to KS001, never an Agreement or Money mutation. */
export type TimingMode = 'on' | 'between' | 'every' | 'after';
export type TimingPurpose = 'delivery' | 'commencement' | 'completion' | 'inspection' |
  'contribution' | 'check-in' | 'check-out' | 'pickup' | 'other';
export type TimingDraft = {
  mode: TimingMode; purpose: TimingPurpose; freePurpose: string;
  day: string; time: string; until: string; untilTime: string; approximate: string;
  repeat: 'week'|'month'; weekday: string; monthDay: string;
  trigger: string; offsetDays: string; context: string; timeZone: string;
};
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return year >= 1900 && year <= 2100 && check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
};
const validTime = (value: string) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const meaningful = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 240);
const allowedPurposes: TimingPurpose[] = ['delivery','commencement','completion','inspection','contribution','check-in','check-out','pickup','other'];
const weekdayLabels = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const localDayOffset=(days:number)=>{
  const current=new Date();
  current.setDate(current.getDate()+days);
  return [current.getFullYear(),String(current.getMonth()+1).padStart(2,'0'),String(current.getDate()).padStart(2,'0')].join('-');
};

export function buildTimingProposal(draft: TimingDraft): { text: string; error: string | null } {
  const purpose = draft.purpose === 'other' ? meaningful(draft.freePurpose) : draft.purpose;
  if (!allowedPurposes.includes(draft.purpose) || !purpose) return { text: '', error: 'What is this date for?' };
  if (!validTime(draft.time) || !validTime(draft.untilTime)) return { text: '', error: 'Enter a valid time.' };
  const context = meaningful(draft.context);
  const related = context ? ' Related to: ' + context + '.' : '';
  const prefix = 'Proposed ' + purpose + ' timing (not yet an agreed contractual commitment): ';
  const zone = ' Device time zone: ' + meaningful(draft.timeZone || 'not available') + '.';
  let detail = '';
  if (draft.mode === 'on') {
    if (draft.day && !validDate(draft.day)) return { text: '', error: 'Choose a real calendar date.' };
    if (!draft.day && !meaningful(draft.approximate)) return { text: '', error: 'Choose a day or describe when in your own words.' };
    detail = draft.day ? 'on ' + draft.day + (draft.time ? ' at ' + draft.time : '') : 'approximately ' + meaningful(draft.approximate) + ' (unresolved, confirm interpretation)';
    if (draft.approximate && draft.day) detail += '; human note: ' + meaningful(draft.approximate);
  } else if (draft.mode === 'between') {
    if (!validDate(draft.day) || !validDate(draft.until)) return { text: '', error: 'Choose valid start and end dates.' };
    if (draft.until < draft.day || (draft.until === draft.day && draft.untilTime && draft.time && draft.untilTime < draft.time))
      return { text: '', error: 'The end must not be before the start.' };
    detail = 'from ' + draft.day + (draft.time ? ' at ' + draft.time : '') + ' through ' + draft.until + (draft.untilTime ? ' at ' + draft.untilTime : '') + ' (local dates)';
  } else if (draft.mode === 'every') {
    if (draft.repeat === 'week') {
      if (!weekdayLabels.includes(draft.weekday)) return { text: '', error: 'Choose a day of the week.' };
      detail = 'every ' + draft.weekday;
    } else if (draft.repeat === 'month') {
      if (!/^(?:[1-9]|1\d|2\d|3[01]|last)$/.test(draft.monthDay)) return { text: '', error: 'Choose the day of the month.' };
      detail = draft.monthDay === 'last' ? 'on the last day of every month' : 'on day ' + draft.monthDay + ' of every month';
      if (Number(draft.monthDay) > 28) detail += ' (months without that day require an agreed handling rule)';
    } else return { text: '', error: 'Choose weekly or monthly.' };
    if (draft.time) detail += ' at ' + draft.time;
    detail += '; start and end dates, holidays and missed occurrences remain to be agreed';
  } else if (draft.mode === 'after') {
    const trigger = meaningful(draft.trigger);
    if (!trigger) return { text: '', error: 'Describe the event that must happen first.' };
    const offset = Number(draft.offsetDays);
    if (!/^\d+$/.test(draft.offsetDays) || offset > 365) return { text: '', error: 'Choose 0–365 days after the event.' };
    detail = offset === 0 ? 'when ' + trigger + ' is verified' : offset + ' calendar day(s) after ' + trigger + ' is verified';
    detail += '; no fixed date exists until the event is independently confirmed';
  } else return { text: '', error: 'Choose a timing type.' };
  return { text: prefix + detail + '.' + zone + related +
    ' Ask me to review the purpose, people, deadlines and any missing conditions. Do not assume acceptance, verify a milestone, amend an accepted Agreement or release Money.', error: null };
}

const field = 'min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-sm text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-700';
const purposes: { value: TimingPurpose; label: string }[] = [
  {value:'delivery',label:'Delivery'}, {value:'commencement',label:'Start of work'},
  {value:'completion',label:'Completion'}, {value:'inspection',label:'Inspection'},
  {value:'contribution',label:'Contribution'}, {value:'check-in',label:'Check-in'},
  {value:'check-out',label:'Check-out'}, {value:'pickup',label:'Pickup'}, {value:'other',label:'Something else'}
];
export function DateTimeTool({ context = '', onPrepare, onClose, isLocalPreview=false }: {
  context?: string; onPrepare?: (message: string) => Promise<void>; onClose?: () => void;isLocalPreview?:boolean;
}) {
  const [draft, setDraft] = useState<TimingDraft>(()=>({
    mode:'on',purpose:'delivery',freePurpose:'',day:'',time:'',until:'',untilTime:'',
    approximate:'',repeat:'month',weekday:'Friday',monthDay:'5',
    trigger:'',offsetDays:'2',context,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Device time zone'
  }));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTimingTypes,setShowTimingTypes]=useState(false);
  const [showTime,setShowTime]=useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [sent, setSent] = useState(false);
  const set = <K extends keyof TimingDraft>(key: K, value: TimingDraft[K]) =>
    setDraft(previous=>({...previous,[key]:value}));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || sent || !onPrepare) return;
    const result = buildTimingProposal(draft);
    if (result.error) { setError(result.error); return; }
    setBusy(true); setError(null);
    try { await onPrepare(result.text); setSent(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The request was not confirmed. Your selection is still here.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={event=>void submit(event)} aria-label="Propose a date or time" className="space-y-4" data-phase3-date-time>
    <p className="text-sm text-sand-700">When should this happen? Choose a day, then add a time only if useful.</p>
    <div role="group" aria-label="Quick date choices" className="grid grid-cols-3 gap-2">
      <button type="button" onClick={()=>{set('mode','on');set('day',localDayOffset(0));setError(null);}}
        className="min-h-11 rounded-xl border border-cream-200 bg-white px-2 text-xs font-semibold">Today</button>
      <button type="button" onClick={()=>{set('mode','on');set('day',localDayOffset(1));setError(null);}}
        className="min-h-11 rounded-xl border border-cream-200 bg-white px-2 text-xs font-semibold">Tomorrow</button>
      <button type="button" onClick={()=>{set('mode','on');setError(null);document.getElementById('phase3-date-picker')?.focus();}}
        className="min-h-11 rounded-xl border border-cream-200 bg-white px-2 text-xs font-semibold">Choose date</button>
    </div>
    <label className="block text-sm font-semibold">Purpose
      <select value={draft.purpose} onChange={e=>set('purpose',e.target.value as TimingPurpose)} className={'mt-1 '+field}>
        {purposes.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
    </label>
    {draft.purpose==='other'&&<label className="block text-sm">What will happen?<input className={'mt-1 '+field} value={draft.freePurpose} onChange={e=>set('freePurpose',e.target.value)} maxLength={240}/></label>}
    <button type="button" aria-expanded={showTimingTypes} onClick={()=>setShowTimingTypes(v=>!v)}
      className="min-h-10 text-xs font-semibold text-forest-800 underline">{showTimingTypes?'Fewer timing options':'More timing options · ranges, repeat, conditions'}</button>
    {showTimingTypes&&<fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Timing type</legend>
      <div className="grid grid-cols-2 gap-2">
        {([['on','On this day'],['between','Between dates'],['every','Repeat'],['after','After an event']] as const).map(([value,label])=>
          <button key={value} type="button" aria-pressed={draft.mode===value} onClick={()=>{set('mode',value);setError(null);}}
            className={'min-h-11 rounded-xl border p-2 text-sm '+(draft.mode===value?'border-forest-700 bg-forest-800 text-white':'border-cream-300 bg-white')}>{label}</button>)}
      </div>
    </fieldset>}
    {(draft.mode==='on'||draft.mode==='between')&&<>
      <label className="block text-sm">{draft.mode==='between'?'Start date':'Date'}
        <input id="phase3-date-picker" aria-label={draft.mode==='between'?'Start date':'Date'} className={'mt-1 '+field} type="date" value={draft.day} onChange={e=>set('day',e.target.value)} min="1900-01-01" max="2100-12-31"/>
      </label>
      {!showTime&&!draft.time&&<button type="button" className="min-h-10 text-xs font-semibold text-forest-800 underline" onClick={()=>setShowTime(true)}>Add a time</button>}
      {(showTime||draft.time)&&<label className="block text-sm">Local time (optional)
        <input aria-label="Proposed local time" className={'mt-1 '+field} type="time" value={draft.time} onChange={e=>set('time',e.target.value)}/>
      </label>}
      {draft.mode==='on'&&<label className="block text-sm">Or say it naturally (approximate dates welcome)
        <input className={'mt-1 '+field} placeholder="e.g. next Friday morning" value={draft.approximate} maxLength={240} onChange={e=>set('approximate',e.target.value)}/>
      </label>}
      {draft.mode==='between'&&<>
        <label className="block text-sm">End date<input className={'mt-1 '+field} type="date" value={draft.until} onChange={e=>set('until',e.target.value)} min={draft.day||'1900-01-01'} max="2100-12-31"/></label>
        <label className="block text-sm">End time (optional)<input className={'mt-1 '+field} type="time" value={draft.untilTime} onChange={e=>set('untilTime',e.target.value)}/></label>
      </>}
    </>}
    {draft.mode==='every'&&<>
      <label className="block text-sm">Repeat
        <select className={'mt-1 '+field} value={draft.repeat} onChange={e=>set('repeat',e.target.value as TimingDraft['repeat'])}>
          <option value="week">Every week</option><option value="month">Every month</option>
        </select>
      </label>
      {draft.repeat==='week'
        ? <label className="block text-sm">Day of the week<select className={'mt-1 '+field} value={draft.weekday} onChange={e=>set('weekday',e.target.value)}>{weekdayLabels.map(day=><option key={day}>{day}</option>)}</select></label>
        : <label className="block text-sm">Day of the month<select className={'mt-1 '+field} value={draft.monthDay} onChange={e=>set('monthDay',e.target.value)}>{Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}<option value="last">Last day</option></select></label>}
      <label className="block text-sm">Time (optional)<input className={'mt-1 '+field} type="time" value={draft.time} onChange={e=>set('time',e.target.value)}/></label>
    </>}
    {draft.mode==='after'&&<>
      <label className="block text-sm">What must happen first?
        <textarea className={'mt-1 '+field} rows={2} value={draft.trigger} maxLength={240}
          placeholder="e.g. the client inspects and accepts the work" onChange={e=>set('trigger',e.target.value)}/>
      </label>
      <label className="block text-sm">Calendar days after that event
        <input className={'mt-1 '+field} type="number" min="0" max="365" step="1" value={draft.offsetDays} onChange={e=>set('offsetDays',e.target.value)}/>
      </label>
      <p className="text-xs text-sand-700">The date stays open until the event is confirmed. Choosing this does not verify the event.</p>
    </>}
    <details open={showAdvanced} onToggle={e=>setShowAdvanced(e.currentTarget.open)} className="rounded-xl border border-cream-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Related milestone or detail (optional)</summary>
      <label className="mt-3 block text-sm">What part of your work?
        <input className={'mt-1 '+field} value={draft.context} maxLength={240} onChange={e=>set('context',e.target.value)} placeholder="e.g. first inspection"/>
      </label>
    </details>
    <p className="flex items-center gap-2 text-xs text-sand-700"><CalendarDays size={16}/> Time zone: {draft.timeZone}. Dates are local to this device until everyone reviews them.</p>
    <p className="text-xs text-sand-700">This is a proposed date, not a booking, acceptance, completed milestone or payment instruction.</p>
    {error&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {sent?<div role="status" className="space-y-2 rounded-xl bg-cream-50 p-3 text-sm">
      <p className="flex gap-2"><CheckCircle2 size={18}/> {isLocalPreview?'Proposed timing added locally. Not agreed or saved.':'Sent to KS001 for review — not agreed yet.'}</p>
      <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-cream-300 px-3">Return to my work</button>
    </div>:<button type="submit" disabled={busy||!onPrepare} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 font-semibold text-white disabled:opacity-50">
      {busy?'Preparing…':isLocalPreview?'Add proposed timing locally':'Ask KS001 to review this date'}
    </button>}
    {!onPrepare&&<p role="status" className="text-xs text-sand-700">Start a real KS001 conversation to use dates in your Agreement. No timing has been saved.</p>}
  </form>;
}
