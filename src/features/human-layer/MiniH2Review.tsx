import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, FileCheck2, HeartHandshake, MessageCircle, Send, ShieldCheck, Users } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';

/**
 * Isolated H2 MINI DESIGN REVIEW, never a real conversation or payment rail.
 * The accepted content is a local fixture to review the phone-first human
 * experience. Production messaging remains canonical SecurePayAPI B4/B5.
 */
type Item = { id: string; from: 'me' | 'other'; body: string; time: string };
const first: Item[] = [
  { id: 'm1', from: 'other', body: 'We are preparing the 200 chairs for Saturday.', time: '9:12 AM' },
  { id: 'm2', from: 'me', body: 'Thank you. Can you confirm arrival before noon?', time: '9:18 AM' },
  { id: 'm3', from: 'other', body: 'Yes, we can deliver before noon. I will confirm the driver shortly.', time: '9:26 AM' },
];

export function MiniH2Review() {
  const [screen, setScreen] = useState<'agreements' | 'detail'>('agreements');
  const [tab, setTab] = useState<'conversation' | 'agreement' | 'people'>('conversation');
  const [messages, setMessages] = useState<Item[]>(first);
  const [draft, setDraft] = useState('');
  const [asSeller, setAsSeller] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  function send() {
    const body = draft.trim();
    if (!body || body.length > 2000) return;
    const d = new Date();
    const time = d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
    setMessages(old => [...old, { id: 'local-' + d.getTime().toString() + '-' + old.length, from: asSeller ? 'other' : 'me', body, time }]);
    setDraft('');
    setHint('Added locally to this design preview. No message was sent to another person.');
  }

  const tile = 'rounded-2xl border border-[#e1e8dc] bg-white shadow-[0_3px_15px_rgba(20,64,37,0.04)]';

  return <div className="min-h-dvh bg-[#faf8f1] text-[#244936]" data-mini-h2-review>
    <header className="sticky top-0 z-20 border-b border-[#e5eadd] bg-[#fffefa]/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} className="h-9 w-9 object-contain" alt=""/>
        <div className="min-w-0 flex-1">
          <strong className="block text-[0.92rem] leading-tight">SecurePay Mini</strong>
          <span className="block text-xs text-[#62756b]">Your trade, your people</span>
        </div>
        <span className="rounded-full border border-[#cbdcca] bg-[#eff5e9] px-2.5 py-1 text-[11px] font-semibold text-[#376448]">H2 Review</span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 pb-20 pt-5">
      {screen === 'agreements' ? <>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b806f]">One place for all your trades</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">My agreements</h1>
          <p className="mt-1 text-sm leading-6 text-[#607468]">Buy, Sell, Pay and Collect are connected through the same Living Agreements.</p>
        </div>
        <div className={tile + ' mb-4 p-4'}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf2e7]"><HeartHandshake className="h-5 w-5 text-[#36724b]"/></div>
            <div>
              <p className="text-sm font-semibold">People are part of every agreement.</p>
              <p className="mt-1 text-xs leading-5 text-[#607468]">Talk directly with your Agreement participants. Keep the conversation beside what you actually agreed.</p>
            </div>
          </div>
        </div>
        <h2 className="mb-2 text-sm font-semibold">Your agreements</h2>
        <button type="button" onClick={() => { setScreen('detail'); setTab('conversation'); setHint(null); }} className={tile + ' w-full p-4 text-left transition hover:border-[#8aab91] focus-visible:outline-2 focus-visible:outline-[#36724b]'} aria-label="Open sample Chair delivery Agreement">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef4e9]"><FileCheck2 className="h-5 w-5 text-[#386746]"/></div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-[#68806e]">Sample Living Agreement</p>
              <p className="mt-0.5 text-base font-semibold">Chair delivery</p>
              <p className="mt-1 text-xs text-[#647567]">200 chairs · Delivery before noon, Saturday</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#eff5e9] px-2.5 py-1 text-xs font-semibold text-[#376448]"><MessageCircle className="h-3.5 w-3.5"/> Conversation <ChevronRight className="h-3.5 w-3.5"/></div>
            </div>
            <ArrowRight className="mt-2 h-5 w-5 text-[#7e9983]"/>
          </div>
        </button>
        <p className="mt-4 rounded-xl border border-[#e8e7d7] bg-[#fffdf7] p-3 text-xs leading-5 text-[#786d5b]">
          This H2 design review uses a sample Agreement so you can inspect Mini without signing in. The messages are not live.
        </p>
      </> : <>
        <button type="button" onClick={() => { setScreen('agreements'); setHint(null); }} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#346648]"><ArrowLeft className="h-4 w-4"/> My agreements</button>
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#718673]">Living Agreement · Sample</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Chair delivery</h1>
          <p className="mt-1 text-sm text-[#607468]">200 chairs · Before noon on Saturday</p>
        </div>
        <div className={tile + ' mb-4 p-3'}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#43734f]"/>
            <p className="flex-1 text-xs leading-5 text-[#526d59]">Only authorized Agreement parties can see a real conversation.</p>
          </div>
        </div>
        <nav className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-[#e5e7de] bg-white p-1.5" aria-label="Agreement sections">
          {([
            ['conversation','Conversation'],
            ['agreement','Agreement'],
            ['people','People'],
          ] as const).map(([id,name]) => <button key={id} type="button" onClick={() => {setTab(id); setHint(null);}}
            className={'min-h-11 rounded-xl px-1.5 text-[0.76rem] font-semibold ' + (tab === id ? 'bg-[#315f43] text-white' : 'text-[#526c5a] hover:bg-[#f1f5ec]')}>{name}</button>)}
        </nav>
        {tab === 'conversation' && <>
          <div className={tile + ' overflow-hidden'}>
            <div className="flex items-center gap-3 border-b border-[#edf0e7] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9f2e8]"><Users className="h-5 w-5 text-[#3d724f]"/></div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">Conversation</h2>
                <p className="text-xs text-[#657a6b]">You and the other Agreement party</p>
              </div>
              <MessageCircle className="h-5 w-5 text-[#66836b]"/>
            </div>
            <div className="p-4">
              <div className="mb-4 rounded-xl bg-[#f1f4ea] px-3 py-2 text-xs leading-5 text-[#5b725f]">A message is a conversation, not a change to agreed terms or a payment instruction.</div>
              <div role="log" aria-label="Sample Agreement conversation" className="space-y-3">
                {messages.map(item => {
                  const mine = asSeller ? item.from === 'other' : item.from === 'me';
                  return <div key={item.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
                    <div className={'max-w-[88%] rounded-2xl px-3.5 py-3 ' + (mine ? 'bg-[#e4f0e2]' : 'border border-[#e7e9e1] bg-[#fffdf9]')}>
                      <p className="mb-1 text-[11px] font-semibold text-[#507559]">{mine ? 'You' : 'Other party'} · {item.time}</p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.body}</p>
                    </div>
                  </div>;
                })}
              </div>
              <form className="mt-5 space-y-2 border-t border-[#e7eade] pt-4" onSubmit={event => {event.preventDefault(); send();}}>
                <label htmlFor="mini-h2-message" className="text-xs font-semibold text-[#536b56]">Your message</label>
                <textarea id="mini-h2-message" rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)}
                  placeholder="Ask a question or share an update…" className="w-full resize-y rounded-xl border border-[#d7e2d4] bg-white p-3 text-sm outline-none focus:border-[#498258]"/>
                <button type="submit" disabled={!draft.trim()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#315f43] px-4 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4"/> Add to preview conversation</button>
                {hint && <p role="status" className="text-xs text-[#6a725b]">{hint}</p>}
              </form>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[#e4e8da] bg-[#fffefa] px-4 py-3">
            <p className="text-xs text-[#5a705e]">Try both sides of the conversation</p>
            <button type="button" onClick={() => setAsSeller(value => !value)} className="min-h-11 rounded-full border border-[#c5d8c5] px-3 text-xs font-semibold text-[#326747]">View as {asSeller ? 'buyer' : 'seller'}</button>
          </div>
        </>}
        {tab === 'agreement' && <section className={tile + ' space-y-3 p-4'}>
          <h2 className="text-base font-semibold">What was agreed</h2>
          {[['What','200 chairs, prepared for delivery'],['When','Before noon, Saturday'],['Who','Buyer and supplier'],['Status','Sample for design review']].map(([title,value])=><div key={title} className="flex gap-4 border-b border-[#edf0e9] pb-3 last:border-0 last:pb-0"><span className="w-14 shrink-0 text-xs font-semibold text-[#68806b]">{title}</span><p className="text-sm">{value}</p></div>)}
          <p className="text-xs leading-5 text-[#657866]">An accepted amendment would have its own recorded version. Chat alone does not revise this Agreement.</p>
        </section>}
        {tab === 'people' && <section className={tile + ' p-4'}>
          <h2 className="mb-3 text-base font-semibold">Agreement people</h2>
          <div className="flex items-center gap-3 border-b border-[#edf0e9] pb-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#e8eee2] font-bold">B</div><div><p className="text-sm font-semibold">Buyer</p><p className="text-xs text-[#667969]">Original Agreement party</p></div><Check className="ml-auto h-4 w-4 text-[#48845a]"/></div>
          <div className="flex items-center gap-3 pt-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#e8eee2] font-bold">S</div><div><p className="text-sm font-semibold">Supplier</p><p className="text-xs text-[#667969]">Original Agreement party</p></div><Check className="ml-auto h-4 w-4 text-[#48845a]"/></div>
          <div className="mt-4 rounded-xl bg-[#f3f5ee] p-3 text-xs leading-5 text-[#657568]">A Plug or Master assigned to a separate task cannot automatically see this conversation.</div>
        </section>}
      </>}
    </main>
  </div>;
}
