import { useState } from 'react';
import {
  ArrowRight, Bell, BriefcaseBusiness, Check, ChevronDown,
  ChevronRight, CreditCard, Handshake, Home,
  MessageCircle, Package, Plus, Search, Settings2,
  ShieldCheck, ShoppingBag, Sparkles, Store, UserRound, Wallet, X
} from 'lucide-react';

type Capacity = 'business' | 'personal';
type Page = 'home' | 'agreements' | 'store' | 'inbox' | 'money';
type Panel = 'none' | 'quote' | 'agreement' | 'ask' | 'payment' | 'offer';
const baseGreen = '#173D31';
const sampleWorks = [
  { id: 'lighting', title: 'Guesthouse solar floodlights', customer: 'Nyeri Guesthouse (sample)', status: 'Your reply needed', stage: 'Enquiry', amount: 'Quote needed', message: 'The buyer is asking whether you can deliver two outdoor lights next week.', next: 'Confirm stock and make a quotation', tone: 'orange' },
  { id: 'roof', title: 'Cement for roof repairs', customer: 'Mugo Builders (sample)', status: 'Terms under review', stage: 'Quotation', amount: 'KSh 15,000', message: 'The buyer is reviewing quantities, delivery and the price quoted.', next: 'Check whether the buyer has replied', tone: 'blue' },
  { id: 'delivery', title: 'Hardware delivery to Varsityville', customer: 'Estate customer (sample)', status: 'Work in progress', stage: 'Living Agreement', amount: 'KSh 4,000', message: 'The delivery obligation is still open. Evidence and completion are due.', next: 'Review delivery evidence', tone: 'green' },
] as const;
const personalWorks = [
  { title: 'My garden repairs', status: 'Planning', note: 'Your personal Agreement work stays under your own KSNumber' },
  { title: 'Saved conversation', status: 'Draft', note: 'Continue privately with KS001 when you choose' },
];
const offerings = [
  { name: 'Solar floodlight · 200W', price: 'KSh 8,500', detail: 'Outdoor lighting', status: 'Stock to confirm', icon: Sparkles },
  { name: 'Cement · 50 kg bag', price: 'KSh 750', detail: 'Building materials', status: 'Stock to confirm', icon: Package },
  { name: 'Delivery service', price: 'Quoted by location', detail: 'Local fulfilment', status: 'Quote needed', icon: Store },
];
const nav: { id: Page; title: string; icon: typeof Home }[] = [
  { id: 'home', title: 'Home', icon: Home },
  { id: 'agreements', title: 'Agreements', icon: Handshake },
  { id: 'store', title: 'Store', icon: ShoppingBag },
  { id: 'inbox', title: 'Inbox', icon: MessageCircle },
  { id: 'money', title: 'Money', icon: Wallet }
];
function Hint() { return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">Sample only</span>; }
function Label({ children }: { children: React.ReactNode }) { return <p className="text-[10px] font-bold uppercase tracking-[.17em] text-slate-500">{children}</p>; }
function QuietCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={'rounded-[20px] border border-[#E5E8E3] bg-white shadow-[0_4px_22px_rgba(32,52,38,0.025)] ' + className}>{children}</div>;
}
export function MiniBusinessContextPreview() {
  const [capacity, setCapacity] = useState<Capacity>('business');
  const [openSwitch, setOpenSwitch] = useState(false);
  const [page, setPage] = useState<Page>('home');
  const [panel, setPanel] = useState<Panel>('none');
  const [selected, setSelected] = useState<string>('lighting');
  const [search, setSearch] = useState('');
  const [ksReply, setKsReply] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const acting = capacity === 'business';
  const selectedWork = sampleWorks.find(w => w.id === selected) ?? sampleWorks[0];
  const go = (next: Page) => { setPage(next); setPanel('none'); setMobileMenu(false); };
  const openWork = (id: string) => { setSelected(id); setPage('agreements'); setPanel('agreement'); };
  const choose = (kind: Capacity) => { setCapacity(kind); setPage('home'); setPanel('none'); setOpenSwitch(false); };
  const requestKs = (prompt: string) => { setKsReply(prompt); setPanel('ask'); };
  const softButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#CFDBD1] bg-white px-3.5 py-2 text-xs font-semibold text-[#20523E] hover:bg-[#F3F8F2]';
  const greenButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#1B513A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#123C2B]';
  return <div className="min-h-screen bg-[#F7F8F5] pb-20 font-sans text-[#233329] md:pb-6">
    <header className="sticky top-0 z-30 border-b border-[#E7EBE5] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1250px] items-center justify-between gap-3 px-4 md:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#193D31] text-white"><Sparkles size={19}/></div>
          <div><div className="text-[15px] font-bold tracking-[-.03em] text-[#193D31]">SECURE<span className="text-[#E75B22]">PAY</span> <span className="font-medium text-slate-600">Mini</span></div><p className="text-[10px] text-slate-500">Your everyday Agreement companion</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-[#F9F2E7] px-3 py-2 text-[11px] font-semibold text-[#9B602B] sm:inline-flex">Visual demonstration</span>
          <button onClick={()=>setMobileMenu(s=>!s)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E9E2] text-[#31513D]" aria-label="Open Mini menu">{mobileMenu?<X size={16}/>:<UserRound size={16}/>}</button>
        </div>
      </div>
      {mobileMenu && <div className="mx-auto flex max-w-[1250px] items-center justify-between border-t border-slate-100 px-5 py-3 text-xs"><span>Mini demo · No real account connected</span><button className="font-semibold text-[#1B513A] underline" onClick={()=>window.location.hash='#/business'}>Business settings demo</button></div>}
    </header>

    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#E7EBE5] bg-white pb-[env(safe-area-inset-bottom)] md:sticky md:bottom-auto md:top-[68px] md:mx-auto md:mt-1 md:max-w-[1150px] md:rounded-[18px] md:border">
      <div className="mx-auto flex max-w-[1150px] justify-around gap-0 px-1 py-1.5 sm:px-3 md:justify-start md:gap-1.5">{nav.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} onClick={()=>go(item.id)} className={'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium sm:text-xs md:min-h-11 md:flex-initial md:flex-row md:gap-2 md:px-5 '+(page===item.id?'bg-[#E4F0E5] font-semibold text-[#1B5B3D]':'text-slate-500 hover:bg-[#F6F8F4]')}><Icon size={18}/><span>{item.title}</span></button>})}</div>
    </nav>

    <main className="mx-auto max-w-[1190px] px-4 pt-5 md:px-7 md:pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <button type="button" onClick={()=>setOpenSwitch(s=>!s)} className="flex min-h-11 items-center gap-3 rounded-2xl border border-[#D8E2D8] bg-white px-3.5 py-2 text-left shadow-sm" aria-expanded={openSwitch} aria-label="Switch acting capacity">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E7F2E9] text-[#236347]">{acting?<BriefcaseBusiness size={16}/>:<UserRound size={16}/>}</span>
            <span><span className="block text-[10px] font-medium text-slate-500">You're acting as</span><span className="block text-[13px] font-semibold text-[#183B2D]">{acting?'Kamakis Traders':'Yourself · Personal'}</span></span>
            <ChevronDown size={15} className="text-[#2A6546]"/>
          </button>
          {openSwitch && <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-80 max-w-[calc(100vw-32px)] rounded-2xl border border-[#DDE5DE] bg-white p-2 shadow-xl">
            <p className="px-3 py-2 text-xs font-medium text-slate-500">Same person, different authorised context</p>
            <button onClick={()=>choose('personal')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#F3F7F2]"><UserRound size={19}/><span className="flex-1"><strong className="block text-sm">My personal space</strong><span className="block text-xs text-slate-500">Your KSNumber and private work</span></span>{!acting&&<Check size={16} className="text-[#207B4A]"/>}</button>
            <button onClick={()=>choose('business')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#F3F7F2]"><BriefcaseBusiness size={19}/><span className="flex-1"><strong className="block text-sm">Kamakis Traders</strong><span className="block text-xs text-slate-500">Business authority — example only</span></span>{acting&&<Check size={16} className="text-[#207B4A]"/>}</button>
            <div className="border-t border-slate-100 px-3 pt-3 pb-1 text-[11px] leading-relaxed text-slate-500">Real switching requires SecurePay to verify your Business membership and permissions.</div>
          </div>}
        </div>
        <div className="flex items-center gap-2">
          <Hint/>
          <button className={softButton} onClick={()=>window.location.hash='#/business'}><Settings2 size={15}/> <span className="hidden sm:inline">Business</span> settings</button>
        </div>
      </div>

      {page === 'home' && <>
        <section className="mb-6 rounded-[24px] border border-[#D6E6D8] bg-gradient-to-br from-[#E9F3E8] to-[#F7F8F2] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[700px]">
              <Label>{acting?'MY BUSINESS TODAY':'MY MINI · PERSONAL'}</Label>
              <h1 className="mt-2 text-[27px] font-semibold tracking-tight text-[#163B2B] sm:text-[34px]">{acting?'Good evening. Your business has work to move forward.':'Good evening. What would you like to get done?'}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#567363]">{acting?'Three example conversations are waiting at different stages. See what matters, then continue the right Agreement.':'Your private conversations, personal Agreements, and plans stay yours, even if you manage a Business.'}</p>
            </div>
            <div className="rounded-full border border-[#CEE1D2] bg-white/75 px-3 py-2 text-xs font-semibold text-[#266346]">{acting?'Acting for Kamakis Traders':'Personal KSNumber'}</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {acting ? <>
              <button onClick={()=>setPanel('quote')} className={greenButton}><Plus size={16}/> Make quotation</button>
              <button onClick={()=>go('store')} className={softButton}><ShoppingBag size={15}/> My Store</button>
              <button onClick={()=>requestKs('I want to help a buyer find an available product.')} className={softButton}><Sparkles size={16}/> Ask KS001</button>
            </> : <>
              <button onClick={()=>requestKs('I want to start a personal Agreement.')} className={greenButton}><Sparkles size={16}/> Start with KS001</button>
              <button onClick={()=>go('agreements')} className={softButton}>My Agreements <ArrowRight size={14}/></button>
            </>}
          </div>
        </section>

        {acting ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.85fr)]">
          <QuietCard className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF0EA] px-5 py-5"><div><h2 className="text-lg font-semibold">Needs your attention</h2><p className="mt-1 text-xs text-slate-500">Sample commercial work — each item opens its own record</p></div><button onClick={()=>go('agreements')} className="flex items-center gap-1 text-xs font-semibold text-[#27644B]">All Agreements <ArrowRight size={14}/></button></div>
            <div className="divide-y divide-[#F0F1ED]">{sampleWorks.map((w,i)=><button key={w.id} onClick={()=>openWork(w.id)} className="flex w-full items-start gap-3 px-5 py-5 text-left hover:bg-[#F8FAF7]">
              <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl '+(i===0?'bg-[#FFF0E5] text-[#B85B25]':'bg-[#E8F2EA] text-[#296746]')}>{i===0?<MessageCircle size={19}/>:<Handshake size={19}/>}</div>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{w.title}</span><span className="mt-1 block text-xs text-slate-500">{w.customer}</span><span className="mt-2 block text-xs text-slate-600">{w.next}</span></span>
              <span className="shrink-0 text-right"><span className="block text-[11px] font-semibold text-[#A85C32]">{w.status}</span><ChevronRight size={15} className="ml-auto mt-2 text-slate-400"/></span>
            </button>)}</div>
          </QuietCard>
          <div className="space-y-5">
            <QuietCard className="p-5"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Your Store</h2><Store size={19} className="text-[#397559]"/></div><p className="mt-2 text-sm text-slate-600">Make it easy for customers to find what you actually sell.</p><div className="mt-4 flex items-center gap-3 rounded-xl bg-[#F6F8F4] p-3"><Package size={20} className="text-[#27724C]"/><div className="flex-1"><p className="text-sm font-semibold">3 sample offers</p><p className="text-xs text-slate-500">Availability still needs confirmation</p></div></div><button onClick={()=>go('store')} className={'mt-4 w-full '+softButton}>Open Store <ArrowRight size={15}/></button></QuietCard>
            <QuietCard className="bg-[#193C30] p-5 text-white"><div className="flex items-center gap-2 text-[#CBE6D0]"><Sparkles size={20}/><span className="text-xs font-semibold">Store Guide · KS001</span></div><h2 className="mt-4 text-lg font-semibold">Help your customer decide.</h2><p className="mt-2 text-sm leading-relaxed text-[#D3E7DA]">Answer questions using verified Store facts, then help both parties get the terms clear.</p><button onClick={()=>requestKs('A customer wants solar lighting for a guesthouse.')} className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#1D523A]">Explore an example <ArrowRight size={14}/></button></QuietCard>
          </div>
        </div> : <div className="grid gap-4 sm:grid-cols-2">
          <QuietCard className="p-5"><h2 className="text-lg font-semibold">My Agreements</h2><p className="mt-2 text-sm text-slate-600">Your individual Agreement work, not the Business's records.</p><button className={'mt-5 '+softButton} onClick={()=>go('agreements')}>Open my Agreements <ArrowRight size={14}/></button></QuietCard>
          <QuietCard className="p-5"><h2 className="text-lg font-semibold">I also manage a Business</h2><p className="mt-2 text-sm text-slate-600">Switch to Kamakis Traders whenever you need to act for that business.</p><button className={'mt-5 '+greenButton} onClick={()=>choose('business')}>Switch to Kamakis Traders <ArrowRight size={14}/></button></QuietCard>
        </div>}
      </>}

      {page === 'agreements' && <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><Label>{acting?'KAMAKIS TRADERS':'PERSONAL KSNUMBER'}</Label><h1 className="mt-2 text-3xl font-semibold tracking-tight">Living Agreements</h1><p className="mt-2 text-sm text-slate-500">{acting?'Follow every customer Agreement from enquiry to finished work.':'These are only your personal records.'}</p></div>{acting&&<button onClick={()=>setPanel('quote')} className={greenButton}><Plus size={16}/> New quotation</button>}</div>
        {acting?<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {sampleWorks.map(w=><button key={w.id} onClick={()=>openWork(w.id)} className={'rounded-[20px] border bg-white p-5 text-left transition-colors hover:border-[#96B79A] '+(selected===w.id&&panel==='agreement'?'border-[#6EA77D]':'border-[#E4E8E2]')}><div className="flex items-start justify-between gap-3"><Label>{w.stage} · example</Label><ChevronRight size={18} className="text-slate-400"/></div><h2 className="mt-3 text-lg font-semibold">{w.title}</h2><p className="mt-1 text-sm text-slate-500">{w.customer}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#FFF0E5] px-3 py-1.5 text-xs font-medium text-[#A8522F]">{w.status}</span><span className="text-sm font-semibold">{w.amount}</span></div><p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-600">{w.next}</p></button>)}</div> : <div className="grid gap-3 sm:grid-cols-2">{personalWorks.map(w=><QuietCard key={w.title} className="p-5"><h2 className="font-semibold">{w.title}</h2><p className="mt-2 text-xs text-slate-500">{w.status}</p><p className="mt-3 text-sm text-slate-600">{w.note}</p></QuietCard>)}</div>}
      </div>}

      {page === 'store' && <div className="space-y-5">
        <div><Label>{acting?'YOUR BUSINESS OFFERS':'EXPLORE'}</Label><h1 className="mt-2 text-3xl font-semibold tracking-tight">{acting?'My Store':'Find a Store'}</h1><p className="mt-2 text-sm text-slate-500">{acting?'Manage the offers customers can ask about.':'The same Store network can help you buy personally.'}</p></div>
        {acting?<><div className="flex flex-wrap gap-2"><button className={greenButton} onClick={()=>setPanel('offer')}><Plus size={15}/> Add an offer</button><button className={softButton} onClick={()=>window.location.hash='#/business'}><Settings2 size={15}/> Store settings and markets</button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{offerings.map((o,i)=>{const Icon=o.icon;return <QuietCard key={o.name} className="overflow-hidden"><div className={'flex h-28 items-center justify-center '+(i===0?'bg-[#EAF1E9]':i===1?'bg-[#F4EBE0]':'bg-[#E8EEF1]')}><Icon size={37} className="text-[#3D6D55]"/></div><div className="p-5"><Hint/><h2 className="mt-3 text-base font-semibold">{o.name}</h2><p className="mt-1 text-xs text-slate-500">{o.detail}</p><p className="mt-3 text-lg font-semibold">{o.price}</p><p className="mt-2 text-xs text-amber-800">{o.status}</p><button className={'mt-4 w-full '+softButton} onClick={()=>requestKs('A buyer asked about '+o.name+'. Help ask what needs confirmation.')}>See buyer journey <ArrowRight size={13}/></button></div></QuietCard>})}</div>
        </>:<QuietCard className="p-6"><Search size={25} className="text-[#397559]"/><h2 className="mt-3 text-lg font-semibold">What are you looking for?</h2><p className="mt-2 text-sm text-slate-500">Mini helps you find real offers and bring a good choice into an Agreement. This preview has no live search.</p><button onClick={()=>requestKs('I want to buy something from a Store.')} className={'mt-5 '+greenButton}>Ask KS001 about buying <ArrowRight size={14}/></button></QuietCard>}</div>}

      {page === 'inbox' && <div className="space-y-5">
        <div><Label>YOUR PERSONAL KSNUMBER'S RECORDS</Label><h1 className="mt-2 text-3xl font-semibold tracking-tight">Inbox</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">One Inbox for the signed-in person. It can contain Agreement conversations you're authorised to see in either capacity. Acting for a Business does not grant access to every employee's private messages.</p></div>
        <QuietCard className="max-w-3xl overflow-hidden"><div className="flex items-center gap-2 border-b border-slate-100 p-5"><MessageCircle size={19} className="text-[#31694E]"/><h2 className="font-semibold">Your conversations</h2><Hint/></div>{sampleWorks.slice(0,2).map(w=><button onClick={()=>openWork(w.id)} key={w.id} className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50"><span className="rounded-xl bg-[#EAF3EA] p-3 text-[#266E4C]"><Bell size={18}/></span><span className="flex-1"><strong className="block text-sm">{w.title}</strong><span className="mt-1 block text-xs text-slate-500">Example record · {w.next}</span></span><ChevronRight size={16}/></button>)}</QuietCard>
      </div>}

      {page === 'money' && <div className="space-y-5">
        <div><Label>AFTER THE AGREEMENT</Label><h1 className="mt-2 text-3xl font-semibold tracking-tight">Money</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">See agreed amounts and available funding routes only when the Agreement and relevant payment checks permit them.</p></div>
        <QuietCard className="max-w-3xl p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#E6F0E8] p-3 text-[#2E7355]"><Wallet size={24}/></span><div><h2 className="text-lg font-semibold">Money follows the Agreement</h2><p className="text-xs text-slate-500">No regulated provider connected in this visual preview</p></div></div><p className="mt-5 text-sm leading-relaxed text-slate-600">A trader shouldn't see a live payment button merely because a price has been typed. When terms are accepted and the provider route is certified, the appropriate stage can present Checkout.</p><button className={'mt-5 '+softButton} onClick={()=>{setSelected('delivery');setPanel('payment');}}>See illustrative Checkout <ArrowRight size={14}/></button></QuietCard>
      </div>}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EAE5] py-4 text-[11px] text-slate-500"><span><ShieldCheck size={13} className="mr-1 inline"/>Read-only demonstration · No KSNumber or business is signed in</span><span>Trust is the currency · <strong>proudly.ke</strong></span></div>
    </main>



    {panel !== 'none' && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#182B20]/40 p-3" role="presentation" onClick={()=>setPanel('none')}>
      <div className="w-full max-w-[520px] overflow-hidden rounded-[23px] border border-[#E6EAE2] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Example detail" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><Label>{panel==='ask'?'KS001 · Store Guide':panel==='quote'?'Quotation':'Sample mini journey'}</Label><h2 className="mt-1 text-lg font-semibold">{panel==='agreement'?selectedWork.title:panel==='payment'?'Agreement Checkout':panel==='ask'?'Ask KS001':panel==='quote'?'Prepare a quotation':panel==='offer'?'Add a Store offer':'Mini'}</h2></div><button className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" onClick={()=>setPanel('none')} aria-label="Close"><X size={20}/></button></div>
        <div className="max-h-[65vh] overflow-y-auto p-5">
          {panel==='agreement'&&<><p className="text-sm text-slate-600">{selectedWork.message}</p><div className="mt-4 rounded-xl bg-[#F6F8F3] p-4 text-sm"><Label>WHAT HAPPENS NEXT</Label><p className="mt-2 font-semibold text-[#284B38]">{selectedWork.next}</p><p className="mt-2 text-xs text-slate-500">Parties, versioned terms, decisions and evidence stay with the original Agreement.</p></div><div className="mt-4 flex flex-wrap gap-2"><button className={greenButton} onClick={()=>requestKs('Help me respond to '+selectedWork.title+' without changing Agreement terms automatically.')}><MessageCircle size={15}/> Ask KS001</button><button className={softButton} onClick={()=>setPanel('payment')}><CreditCard size={15}/> Payment stage</button></div></>}
          {panel==='quote'&&<><p className="text-sm leading-relaxed text-slate-600">From a customer enquiry, Mini should help you confirm items, quantities, price method, delivery location and dates before you send a seller-owned quotation.</p><div className="mt-4 space-y-2 rounded-xl bg-[#F6F8F4] p-4 text-sm"><p>1. Confirm exactly what you can supply</p><p>2. State price and fulfilment terms</p><p>3. Let the buyer review or counteroffer</p><p>4. Record the accepted version as a Living Agreement</p></div><p className="mt-4 text-xs text-amber-800">Example flow only. No quotation is saved or sent.</p></>}
          {panel==='offer'&&<><p className="text-sm leading-relaxed text-slate-600">Add the item, price or price method, availability, location, delivery and any conditions that matter before a customer relies on the offer.</p><p className="mt-4 rounded-xl bg-[#F6F8F4] p-4 text-xs text-slate-600">Store publication, network distribution and merchant eligibility are separate, permission-checked operations.</p></>}
          {panel==='ask'&&<><div className="flex gap-2"><span className="h-9 w-9 shrink-0 rounded-xl bg-[#E7F2E8] p-2 text-[#286444]"><Sparkles size={18}/></span><div className="rounded-2xl bg-[#F3F7F1] p-4 text-sm text-slate-700"><p className="font-semibold text-[#174730]">KS001 · Illustration</p><p className="mt-2">I can help with that. Let's first confirm the real Store offer, availability and what the customer needs. Nothing becomes an Agreement without the right parties reviewing it.</p></div></div><p className="mt-4 text-xs text-slate-500">Your example request: {ksReply ?? 'Help with an Agreement'}</p><div className="mt-4 flex flex-wrap gap-2">{['Check availability','Ask about delivery','Prepare quotation'].map(x=><button key={x} onClick={()=>setKsReply(x)} className={softButton}>{x}</button>)}</div><p className="mt-4 text-xs text-amber-800">This is sample guidance; no assistant or product API is connected.</p></>}
          {panel==='payment'&&<><div className="mb-4 rounded-xl border border-[#D9E4DA] bg-[#F5F8F4] p-4"><Label>CHECKOUT ONLY WHEN IT IS DUE</Label><h3 className="mt-2 text-base font-semibold">Business Agreement payment stage</h3><p className="mt-2 text-sm text-slate-600">Payment route and amounts must come from the actual accepted Agreement and certified provider—not this preview.</p></div><div className="flex justify-between border-b border-slate-100 py-3 text-sm"><span>Example Agreement</span><strong>Hardware delivery</strong></div><div className="flex justify-between border-b border-slate-100 py-3 text-sm"><span>Sample amount</span><strong>KSh 4,000</strong></div><button disabled className="mt-5 min-h-11 w-full cursor-not-allowed rounded-xl bg-slate-200 text-sm font-semibold text-slate-500">Payment unavailable in demonstration</button><p className="mt-3 text-xs text-slate-500">No funds can be moved from this page.</p></>}
        </div>
      </div>
    </div>}
  </div>;
}
