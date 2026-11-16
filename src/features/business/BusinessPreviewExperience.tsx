import { useState, type ReactNode } from 'react';
import { BusinessSettingsHub } from './BusinessSettingsHub';
import {
  ArrowRight, BookOpenText, CheckCircle2, ChevronRight,
  ClipboardCheck, CreditCard, FileText, Globe2, Handshake,
  LayoutDashboard, Link2, Menu, Package,
  ShieldCheck, ShoppingBag,
  Settings2, Sparkles, Store, X
} from 'lucide-react';

type BusinessPage = 'settings' | 'overview' | 'store' | 'agreements' | 'links' | 'checkout' | 'network' | 'guide' | 'tax';
const links: { key: BusinessPage; label: string; icon: typeof Store }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'settings', label: 'Business Settings', icon: Settings2 },
  { key: 'store', label: 'My Store', icon: Store },
  { key: 'agreements', label: 'Living Agreements', icon: Handshake },
  { key: 'links', label: 'SecureLinks', icon: Link2 },
  { key: 'checkout', label: 'Checkout', icon: CreditCard },
  { key: 'network', label: 'Store Network', icon: Globe2 },
  { key: 'guide', label: 'Store Guide · KS001', icon: Sparkles },
  { key: 'tax', label: 'eTIMS (optional)', icon: FileText },
];
const offers = [
  { name: 'Solar floodlight · 200W', detail: 'Outdoor lighting · Collection or delivery', amount: 'KSh 8,500', label: 'Example offer' },
  { name: 'Cement · 50 kg bag', detail: 'Building materials · Per bag', amount: 'KSh 750', label: 'Example offer' },
  { name: 'Hardware delivery', detail: 'Local delivery · Quote after location', amount: 'On request', label: 'Example service' },
];
const work = [
  { title: 'Solar lighting for a guesthouse', person: 'Customer enquiry', status: 'Needs your reply', note: 'Confirm availability and delivery details', tag: 'attention' },
  { title: 'Materials supply · roof repair', person: 'Buyer and seller', status: 'Reviewing terms', note: 'Agreement awaits both parties', tag: 'review' },
  { title: 'Hardware delivery to an estate', person: 'Confirmed agreement', status: 'In progress', note: 'Delivery evidence to be added', tag: 'progress' },
];
function SamplePill({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">{children}</span>;
}
function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="mb-6">
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.18em] text-orange-700">{eyebrow}</p>
    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{children}</p>
  </div>;
}
function ExampleBanner() {
  return <div className="flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
    <ShieldCheck size={17} className="mt-0.5 shrink-0" />
    <span><strong>Read-only Business demonstration.</strong> Kamakis Traders, its offers, customers and agreements are sample content. Nothing here creates an account, changes real Stores, publishes offers or moves money.</span>
  </div>;
}
export function BusinessPreviewExperience() {
  const [page, setPage] = useState<BusinessPage>('settings');
  const [mobileMenu, setMobileMenu] = useState(false);
  const title = links.find(x => x.key === page)?.label ?? 'Overview';
  const navigate = (to: BusinessPage) => { setPage(to); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return <div className="min-h-screen bg-[#F6F7F4] font-sans text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[74px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-7">
        <div className="flex items-center gap-3">
          <button aria-label="Toggle navigation" type="button" className="rounded-xl border border-slate-200 p-2.5 lg:hidden" onClick={() => setMobileMenu(v => !v)}>{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#193D35] text-white"><Store size={21} /></div>
          <div><div className="text-sm font-bold tracking-tight text-[#15372E]">SECURE<span className="text-orange-600">PAY</span> <span className="ml-1 text-slate-700">for Business</span></div><div className="mt-0.5 text-[11px] text-slate-500">Your trade, agreements and customers</div></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">Visual preview</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F1EC] px-3 py-2 text-xs font-semibold text-[#1D5944]"><span className="h-2 w-2 rounded-full bg-[#3A9368]"/>Sample business</span>
        </div>
      </div>
    </header>
    <div className="mx-auto flex max-w-[1500px]">
      <aside className={(mobileMenu ? 'block' : 'hidden') + ' fixed bottom-0 left-0 top-[74px] z-10 w-[265px] overflow-y-auto border-r border-slate-200 bg-white px-3 py-5 lg:sticky lg:block lg:h-[calc(100vh-74px)] lg:shrink-0'}>
        <div className="mb-6 rounded-2xl bg-[#17392F] p-4 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[.17em] text-emerald-200">Merchant space</p>
          <p className="mt-2 text-lg font-semibold">Kamakis Traders</p>
          <p className="mt-1 text-xs text-emerald-100">Example business · Kenya</p>
        </div>
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Manage business</p>
        <nav aria-label="Business sections" className="space-y-1">
          {links.map(item => <button key={item.key} type="button" onClick={() => navigate(item.key)}
            className={(page === item.key ? 'bg-[#EAF2EC] text-[#194B36]' : 'text-slate-600 hover:bg-slate-100') + ' flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-colors'}>
            <item.icon size={18} strokeWidth={page === item.key ? 2.3 : 1.9} />
            <span className="flex-1">{item.label}</span>{page === item.key && <span className="h-1.5 w-1.5 rounded-full bg-[#1A6B4C]"/>}
          </button>)}
        </nav>
        <div className="mt-7 rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-800">Business membership</p>
          <p className="mt-1 text-xl font-bold text-[#15372E]">KSh 200<span className="ml-1 text-xs font-normal text-slate-500">/ month</span></p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Proposed Business plan. No subscription is active in this demonstration.</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-7 lg:px-10 lg:pt-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">SecurePay <ChevronRight size={12} className="mx-1 inline"/> For Business <ChevronRight size={12} className="mx-1 inline"/> <span className="font-semibold text-slate-800">{title}</span></div>
          <SamplePill>Preview · Not connected to real records</SamplePill>
        </div>
        <ExampleBanner />

        {page === 'settings' && <BusinessSettingsHub onOpen={navigate}/>}

        {page === 'overview' && <div className="pt-8">
          <SectionHeading eyebrow="Good business starts with a clear agreement" title="Good evening, Kamakis Traders.">
            See what needs your attention, keep your Store ready, and follow each agreement from first enquiry through completed work.
          </SectionHeading>
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <button type="button" onClick={() => navigate('agreements')} className="rounded-2xl border border-[#D1DFD4] bg-[#E9F3EB] p-5 text-left hover:bg-[#DDEFE2]">
              <div className="flex items-center justify-between text-[#28614A]"><Handshake size={23}/><ArrowRight size={17}/></div>
              <p className="mt-5 text-3xl font-bold text-[#163B2D]">3</p><p className="mt-1 text-sm font-semibold text-[#173F30]">Living Agreements</p><p className="mt-2 text-xs text-[#506E5A]">Sample records to explore</p>
            </button>
            <button type="button" onClick={() => navigate('store')} className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-slate-300">
              <div className="flex items-center justify-between text-[#765228]"><Package size={23}/><ArrowRight size={17}/></div>
              <p className="mt-5 text-3xl font-bold">3</p><p className="mt-1 text-sm font-semibold">Store offers</p><p className="mt-2 text-xs text-slate-500">Products and services shown as examples</p>
            </button>
            <button type="button" onClick={() => navigate('network')} className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-slate-300">
              <div className="flex items-center justify-between text-[#765228]"><Globe2 size={23}/><ArrowRight size={17}/></div>
              <p className="mt-5 text-3xl font-bold">4</p><p className="mt-1 text-sm font-semibold">Connected markets</p><p className="mt-2 text-xs text-slate-500">Choose where your offers may appear</p>
            </button>
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h3 className="font-semibold">Needs your attention</h3><button onClick={() => navigate('agreements')} className="text-xs font-semibold text-[#286447]">All Agreements <ArrowRight size={13} className="inline"/></button></div>
              <div className="divide-y divide-slate-100">{work.map((w,i) => <button type="button" onClick={() => navigate('agreements')} key={w.title} className="flex w-full gap-3 px-5 py-4 text-left hover:bg-slate-50">
                <span className={(i===0?'bg-orange-50 text-orange-600':'bg-slate-100 text-slate-500')+' flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'}><ClipboardCheck size={19}/></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{w.title}</span><span className="mt-1 block text-xs text-slate-500">{w.note}</span></span>
                <span className="shrink-0 text-[11px] font-semibold text-orange-700">{w.status}</span>
              </button>)}</div>
            </section>
            <section className="flex flex-col rounded-2xl bg-[#173B31] p-6 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><Sparkles size={24}/></div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[.15em] text-[#BDE2CA]">Your Store Guide</p>
              <h3 className="mt-1 text-xl font-semibold">Let customers ask. Give them something useful.</h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100">KS001 can help a buyer explore your verified offers and ask the right questions before an Agreement begins. It must not invent stock or prices.</p>
              <button type="button" onClick={() => navigate('guide')} className="mt-6 flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#173B31]">Explore Store Guide <ArrowRight size={15}/></button>
            </section>
          </div>
        </div>}

        {page === 'store' && <div className="pt-8">
          <SectionHeading eyebrow="Your digital shop" title="My Store">A simple, familiar shopfront for real goods and services. Each offer carries enough information to begin a worthwhile Agreement.</SectionHeading>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-3"><ShoppingBag size={22} className="text-[#1C5D43]"/><div><p className="text-sm font-semibold">Kamakis Traders · Example Store</p><p className="text-xs text-slate-500">Three offers · No published live catalogue</p></div></div><SamplePill>Example only</SamplePill></div>
          <div className="grid gap-4 lg:grid-cols-3">{offers.map((o,i)=><article key={o.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className={(i===0?'bg-[#E5ECE7]':i===1?'bg-[#F1E8DC]':'bg-[#E3EAF2]')+' flex h-36 items-center justify-center text-slate-500'}>{i===0?<Sparkles size={46} strokeWidth={1.2}/>:i===1?<Package size={46} strokeWidth={1.2}/>:<Store size={46} strokeWidth={1.2}/>}</div>
            <div className="p-5"><p className="text-[11px] font-semibold text-orange-700">{o.label}</p><h3 className="mt-2 text-base font-semibold">{o.name}</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">{o.detail}</p><p className="mt-4 text-lg font-bold text-[#214F3D]">{o.amount}</p><p className="mt-2 text-xs text-slate-500">Availability must be confirmed before any quote.</p></div>
          </article>)}</div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold">What a merchant will manage here</p><p className="mt-2 text-sm text-slate-600">Offers, verified stock, product descriptions, pricing methods, delivery or collection options, enquiries and their Agreement handoffs.</p></div>
        </div>}

        {page === 'agreements' && <div className="pt-8">
          <SectionHeading eyebrow="Work that continues after yes" title="Living Agreements">An agreement is not a receipt. Follow the accepted terms, people, obligations, evidence, changes and completion.</SectionHeading>
          <div className="space-y-3">{work.map((w,i)=><div key={w.title} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#A76024]">Sample Agreement {String(i+1).padStart(2,'0')}</p><h3 className="mt-2 text-lg font-semibold">{w.title}</h3><p className="mt-1 text-sm text-slate-500">{w.person}</p></div><SamplePill>{w.status}</SamplePill></div><div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600 sm:grid-cols-3"><p><CheckCircle2 size={15} className="mr-1 inline text-[#357658]"/> Parties and terms</p><p><ClipboardCheck size={15} className="mr-1 inline text-[#357658]"/> Obligations and milestones</p><p><FileText size={15} className="mr-1 inline text-[#357658]"/> Evidence and decisions</p></div></div>)}</div>
        </div>}

        {page === 'links' && <div className="pt-8">
          <SectionHeading eyebrow="One conversation, one commercial record" title="SecureLinks">Give a customer a link to your offer or developing Agreement, even when you are talking on WhatsApp or another channel.</SectionHeading>
          <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-[#27684D]"><Link2 size={25}/></div><div><h3 className="text-lg font-semibold">Keep the Agreement at the centre</h3><p className="text-sm text-slate-500">A SecureLink opens the authorized record, not an uncontrolled copy of the conversation.</p></div></div><div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">Illustration: Offer → Review or counteroffer → Confirm terms → Perform → Evidence and Money status</div><p className="mt-3 text-xs text-slate-500">This demonstration cannot create or share a live SecureLink.</p></div>
        </div>}

        {page === 'checkout' && <div className="pt-8">
          <SectionHeading eyebrow="Money follows the Agreement" title="SecurePay Checkout">Checkout appears when there is something agreed to pay for, not before the customer understands the trade.</SectionHeading>
          <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6"><div className="mb-5 flex items-center gap-3"><CreditCard className="text-[#255C43]"/><h3 className="font-semibold">Illustrative Agreement checkout</h3></div><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Offer</span><span>Solar floodlight (example)</span></div><div className="flex justify-between"><span className="text-slate-500">Seller</span><span>Kamakis Traders (example)</span></div><div className="flex justify-between"><span className="text-slate-500">Price</span><span>KSh 8,500 (sample)</span></div><div className="flex justify-between border-t border-slate-200 pt-3 font-semibold"><span>Payment</span><span>Not available in this demo</span></div></div><div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">Real payment instructions require a confirmed Agreement, authorized parties, and certified provider and Money controls. No payment is initiated here.</div></div>
        </div>}

        {page === 'network' && <div className="pt-8">
          <SectionHeading eyebrow="Choose your reach" title="Store Network">Your Store should not be automatically promoted everywhere. The merchant chooses the communities and applications where eligible offers can be shown.</SectionHeading>
          <div className="grid gap-3 sm:grid-cols-2">{[
            ['Varsityville Estate','Let local residents discover relevant products and services'],
            ['Shortstays','Help guests or hosts find verified local offers'],
            ['SecurePay Mini','Allow direct Store and offer discovery'],
            ['My Ride and Storage','Only where category and provider eligibility are independently verified']
          ].map(([name,description])=><div key={name} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><Globe2 size={21} className="text-[#2A7551]"/><SamplePill>Not connected</SamplePill></div><h3 className="mt-4 text-base font-semibold">{name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p></div>)}</div>
          <p className="mt-5 text-sm text-slate-600">The real B1 code includes publication permissions and eligibility checks. No consent or network distribution can be switched on in this read-only demonstration.</p>
        </div>}

        {page === 'guide' && <div className="pt-8">
          <SectionHeading eyebrow="A knowledgeable assistant for your shop" title="Store Guide · KS001">Teach your Store Guide only facts you can stand behind. It should help customers find what is available and clarify what needs confirmation.</SectionHeading>
          <div className="max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center gap-3 border-b border-slate-100 p-5"><div className="rounded-xl bg-[#E8F1EA] p-3 text-[#276448]"><Sparkles size={24}/></div><div><h3 className="font-semibold">Ask Kamakis Traders</h3><p className="text-xs text-slate-500">Example conversation · not connected to KS001</p></div></div><div className="space-y-4 p-6"><div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#E9F0E8] p-4 text-sm text-slate-800">Do you have solar floodlights for a guesthouse?</div><div className="max-w-[89%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">The sample catalogue includes a 200W solar floodlight. Before making an Agreement, the merchant should confirm current stock, delivery location and price.</div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">Check availability</span><span className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">Ask about delivery</span><span className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">Request a quotation</span></div></div><div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs text-slate-500">Demonstration only. No messages are being sent.</div></div>
        </div>}

        {page === 'tax' && <div className="pt-8">
          <SectionHeading eyebrow="Better records, when merchants choose" title="eTIMS · Optional">Prepare for compliant invoicing and correct buyer details without making every small trader surrender control of how they operate.</SectionHeading>
          <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6"><div className="flex gap-3"><BookOpenText size={25} className="text-[#27674B]"/><div><h3 className="text-lg font-semibold">A future integration choice</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Businesses may connect KRA eTIMS where supported, identify the correct party entitled to the tax invoice, and keep agreement records aligned. Legal invoicing duties still apply independently of any opt-in integration.</p><p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-950">No eTIMS or KRA connection is active in this demonstration. Integration and tax treatment require separate certification and verification.</p></div></div></div>
        </div>}
        <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500"><span>SecurePay for Business · Visual demonstration</span><span>Trust is the currency. Money follows the Agreement.</span></footer>
      </main>
    </div>
  </div>;
}
