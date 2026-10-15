import { useState } from 'react';
import { ArrowLeft, BedDouble, CarFront, Check, FileText, Plus, ShieldCheck, Trash2 } from 'lucide-react';

export type QuickAssistId = 'stays' | 'ride' | 'documents';

type QuickAssistProps = {
  collection: QuickAssistId[];
  onCollectionChange: (next: QuickAssistId[]) => void;
  initialRequest?: string;
  onContinue?: (request: string) => Promise<void>;
  onFindStoreOffers?: (kind: 'stays' | 'ride', requestedTask: string) => void;
};

const services = [
  { id: 'stays' as const, title: 'Short Stays', description: 'Find somewhere to stay', Icon: BedDouble },
  { id: 'ride' as const, title: 'My Ride', description: 'Move yourself or something', Icon: CarFront },
  { id: 'documents' as const, title: 'Quick Documents', description: 'Prepare a simple draft', Icon: FileText },
];

export function suggestedQuickAssist(request: string): QuickAssistId | null {
  const text = request.toLowerCase();
  if (/\b(hotel|room|overnight|accommodation|lodging|guesthouse|short stay|airbnb|sleep|check.in)\b/.test(text)) return 'stays';
  if (/\b(ride|rider|taxi|transport|delivery|deliver|parcel|pickup|drop.off|courier|drive|trip)\b/.test(text)) return 'ride';
  if (/\b(invoice|receipt|quotation)\b/.test(text)) return 'documents';
  return null;
}

function requestForKs001(service: 'stays' | 'ride', description: string, journey: 'person' | 'goods') {
  const task = service === 'stays' ? 'Short Stays accommodation' : journey === 'goods' ? 'My Ride delivery' : 'My Ride journey';
  return 'Please help me prepare a ' + task + ' request. I explicitly chose to share only this description: "' +
    description.trim() + '". Ask only the next material missing question. If suitable verified provider options are available through authorised SecurePay tools, help me compare their actual prices and terms. If none are connected, say so plainly. Do not invent availability, verified providers, prices or bookings. Do not share my device location, read unrelated Agreements, contact providers, create an Agreement or authorise any payment on my behalf.';
}

/** A first-party, local-first capability. A tool being visible or added does not grant it any authority. */
export function QuickSupportPanel({ collection, onCollectionChange, initialRequest = '', onContinue, onFindStoreOffers }: QuickAssistProps) {
  const [selected, setSelected] = useState<QuickAssistId | null>(() => suggestedQuickAssist(initialRequest));
  const [catalogue, setCatalogue] = useState(false);
  const [request, setRequest] = useState(initialRequest);
  const [journey, setJourney] = useState<'person' | 'goods'>('person');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prepared, setPrepared] = useState(false);
  const [documentType, setDocumentType] = useState('Invoice');
  const [recipient, setRecipient] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const add = (id: QuickAssistId) => {
    if (!collection.includes(id)) onCollectionChange([...collection, id]);
    setCatalogue(false);
    setSelected(id);
  };
  const remove = (id: QuickAssistId) => {
    onCollectionChange(collection.filter(value => value !== id));
    setSelected(null);
  };
  const openOnce = (id: QuickAssistId) => {
    setCatalogue(false);
    setSelected(id);
  };
  const back = () => {
    setSelected(null);
    setCatalogue(false);
    setError('');
    setPrepared(false);
  };
  const sendRequest = async () => {
    if (busy) return;
    if (!request.trim()) {
      setError(selected === 'stays' ? 'Tell us where and when you would like to stay.' : 'Tell us what needs moving, where and when.');
      return;
    }
    setError('');
    if (!onContinue) {
      setPrepared(true);
      return;
    }
    setBusy(true);
    try {
      await onContinue(requestForKs001(selected === 'stays' ? 'stays' : 'ride', request, journey));
      setPrepared(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach KS001. Your request is still here.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="space-y-3" aria-label="Quick Assist">
    <p className="text-sm text-sand-600">A little help, right when you need it.</p>
    {selected === null && !catalogue && <div className="space-y-2">
      <p className="text-xs font-medium text-sand-600">Your tools · this workspace session</p>
      {services.filter(service => collection.includes(service.id)).map(({ id, title, description: details, Icon }) =>
        <div key={id} className="flex items-center gap-1 rounded-xl border border-cream-200 bg-white">
          <button type="button" className="flex min-h-14 min-w-0 flex-1 items-center gap-3 p-3 text-left" onClick={() => openOnce(id)}>
            <Icon size={20} aria-hidden="true" />
            <span className="min-w-0"><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-sand-600">{details}</span></span>
          </button>
          <button type="button" aria-label={'Remove ' + title + ' from my tools'} title={'Remove ' + title} className="min-h-11 min-w-11 rounded-lg text-sand-600 hover:bg-cream-100" onClick={() => remove(id)}>
            <Trash2 size={16} className="mx-auto" />
          </button>
        </div>)}
      <button type="button" onClick={() => setCatalogue(true)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-dashed border-cream-300 p-3 text-sm font-semibold">
        <Plus size={20} aria-hidden="true" /> Add a tool
      </button>
      <p className="text-xs text-sand-600">Your collection is not a permission grant. No location, Agreements, bookings or money are shared.</p>
    </div>}
    {selected === null && catalogue && <div className="space-y-2">
      <button type="button" onClick={back} className="flex min-h-11 items-center gap-2 text-xs"><ArrowLeft size={16}/> Your tools</button>
      <h4 className="font-semibold">Add a tool</h4>
      {services.filter(service => !collection.includes(service.id)).map(({ id, title, description: details, Icon }) =>
        <div key={id} className="rounded-xl border border-cream-200 p-3">
          <div className="flex items-start gap-3"><Icon size={20}/><div><strong className="text-sm">{title}</strong><p className="text-xs text-sand-600">{details}</p></div></div>
          <div className="mt-2 flex gap-2">
            <button type="button" className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs font-semibold" onClick={() => openOnce(id)}>Use once</button>
            <button type="button" className="min-h-11 rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white" onClick={() => add(id)}>Add to my tools</button>
          </div>
        </div>)}
      {services.every(service => collection.includes(service.id)) && <p className="text-sm text-sand-600">All currently available tools are already in your collection. More verified capabilities can be offered later.</p>}
    </div>}
    {selected !== null && <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={back} className="flex min-h-11 items-center gap-2 text-xs"><ArrowLeft size={16}/> Quick Assist</button>
        {!collection.includes(selected) ?
          <button type="button" className="min-h-11 rounded-lg border border-cream-200 px-3 text-xs" onClick={() => add(selected)}><Plus size={14} className="mr-1 inline"/>Keep this tool</button> :
          <span className="flex items-center gap-1 text-xs text-sand-600"><Check size={14}/> In your tools</span>}
      </div>
      <h4 className="font-semibold">{services.find(service => service.id === selected)?.title}</h4>
      {selected === 'documents' ? <div className="space-y-3">
        <label className="block text-xs font-semibold">Document type<select value={documentType} onChange={event => setDocumentType(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2"><option>Invoice</option><option>Receipt</option><option>Quotation</option></select></label>
        <label className="block text-xs font-semibold">Customer or recipient<input value={recipient} onChange={event => setRecipient(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2" placeholder="Customer"/></label>
        <label className="block text-xs font-semibold">Items or description<input value={description} onChange={event => setDescription(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2" placeholder="What is it for?"/></label>
        <label className="block text-xs font-semibold">Amount (KES)<input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2" placeholder="Amount"/></label>
        <div className="rounded-xl bg-cream-100 p-4"><p className="text-xs uppercase tracking-wide text-sand-600">Draft preview · not issued</p><p className="mt-2 font-semibold">{documentType}</p><p className="mt-2 text-sm">For: {recipient || 'Not supplied'}</p><p className="text-sm">Item: {description || 'Not supplied'}</p><p className="text-sm">KES {amount || '—'}</p><p className="mt-3 text-xs text-sand-600">{documentType === 'Receipt' ? 'A receipt must identify genuine payment evidence or be explicitly labelled user-declared; this is not proof of payment.' : documentType === 'Invoice' ? 'An invoice requests payment; it does not prove payment.' : 'A quotation is a proposal, not an accepted Agreement.'}</p></div>
      </div> : <>
        {selected === 'ride' && <fieldset className="flex gap-2"><legend className="mb-1 text-xs font-semibold">What are we moving?</legend>
          <button type="button" aria-pressed={journey === 'person'} onClick={() => setJourney('person')} className={'min-h-11 flex-1 rounded-xl border p-2 text-sm ' + (journey === 'person' ? 'border-forest-800 bg-cream-100 font-semibold' : 'border-cream-200')}>Me / people</button>
          <button type="button" aria-pressed={journey === 'goods'} onClick={() => setJourney('goods')} className={'min-h-11 flex-1 rounded-xl border p-2 text-sm ' + (journey === 'goods' ? 'border-forest-800 bg-cream-100 font-semibold' : 'border-cream-200')}>Goods</button>
        </fieldset>}
        <label className="block text-sm font-semibold" htmlFor="quick-assist-request">{selected === 'stays' ? 'Where and when would you like to stay?' : 'Where, when, and what needs moving?'}</label>
        <textarea id="quick-assist-request" rows={3} maxLength={1200} value={request} onChange={event => {setRequest(event.target.value);setPrepared(false);setError('');}}
          placeholder={selected === 'stays' ? 'A quiet room in Nakuru on Friday for two people, under KSh 4,000' : journey === 'goods' ? 'A small parcel from Kilimani to Westlands tomorrow morning' : 'Two people from Karen to the airport early on Friday'}
          className="min-h-24 w-full resize-y rounded-xl border border-cream-200 p-3 text-sm"/>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="button" disabled={busy || !request.trim()} onClick={() => void sendRequest()} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Asking KS001…' : onContinue ? 'Continue with KS001' : 'Prepare this request'}
        </button>
        {prepared && !onContinue && <div role="status" className="rounded-xl bg-cream-100 p-3 text-sm"><strong>Request ready</strong><p className="mt-1 whitespace-pre-wrap">{request.trim()}</p><p className="mt-2 text-xs text-sand-600">Prepared locally only. No booking or provider search was made.</p></div>}
        {onFindStoreOffers && <button type="button" onClick={() => onFindStoreOffers(selected === 'stays' ? 'stays' : 'ride', request.trim())}
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-cream-200 bg-white px-4 text-sm font-semibold">
          Find published offers in Stores
        </button>}
        <p className="text-xs text-sand-600">{onContinue ? 'Only this request is sent to KS001 when you choose Continue. ' : 'You can prepare a request without signing in. '}Store listings are discovery, not confirmed provider bookings. Live booking/dispatch integrations are not connected here yet; actual availability, prices and terms must be confirmed by the provider. No booking or payment is made.</p>
      </>}
      {selected !== 'documents' && <p className="text-xs text-sand-600">Any actual provider must identify itself, show its verified terms, price and cancellation or delivery conditions, and ask for your approval before commitment.</p>}
    </div>}
    <p className="flex items-start gap-2 border-t border-cream-100 pt-3 text-xs text-sand-600"><ShieldCheck size={15} className="shrink-0"/> Quick Assist cannot search live provider availability, dispatch transport, reserve accommodation or make payment until verified connections exist. Adding, removing or using a tool never silently creates an Agreement, charges you or shares private workspace information.</p>
  </section>;
}
