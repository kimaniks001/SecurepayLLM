import { useState } from 'react';
import { ArrowLeft, Camera, FileText, HeartHandshake, Landmark, Lightbulb, MapPin, MessageCircle, Plus, Store, UserRoundPlus, Wallet, X, Wrench, Users, Truck, BedDouble } from 'lucide-react';

type Mode = 'work' | 'vision' | 'circle' | 'community';
type Screen = 'chat' | 'result' | 'tools';
const tools = [
  { name: 'People & Invitations', icon: UserRoundPlus, description: 'Find people, invite participants and clarify roles and permissions.' },
  { name: 'Places', icon: MapPin, description: 'Find or select a saved location for your work.' },
  { name: 'Documents', icon: FileText, description: 'Attach documents; saved, interpreted and confirmed are distinct states.' },
  { name: 'Photos', icon: Camera, description: 'Attach photos and caption them in your conversation.' },
  { name: 'Stores', icon: Store, description: 'Find products, suppliers and services.' },
  { name: 'Money', icon: Wallet, description: 'See Agreement funding readiness and authorised next actions.' },
  { name: 'Financial Institutions', icon: Landmark, description: 'Find bank, finance and insurance options.' },
  { name: 'Short Stays', icon: BedDouble, description: 'Explore accommodation providers, subject to confirmed availability.' },
  { name: 'My Ride', icon: Truck, description: 'Explore transport assistance; quotes and dispatch require a provider.' },
  { name: 'Community & Circles', icon: Users, description: 'Find people, groups, projects and shared work.' },
  { name: 'More tools', icon: Wrench, description: 'Additional SecurePay capabilities will appear here.' },
];
const scenarios: Record<Mode, { label: string; title: string; status: string; opening: string; facts: string[]; help: string[] }> = {
  work: { label: 'My Work · Agreement', title: 'Chair delivery', status: 'Draft', opening: 'I can help make a clear chair delivery agreement. Where should the chairs be delivered?', facts: ['200 chairs · proposed scope', 'Delivery location needed', 'Supplier and price to establish'], help: ['Stores and delivery providers', 'Plugs for coordination', 'Potential Community Saver, subject to Plug verification'] },
  vision: { label: 'Vision · Explore', title: 'My workshop idea', status: 'Exploring', opening: 'What would you most like your workshop to make possible?', facts: ['Explore purpose and layout', 'Collect inspiration and suppliers', 'No Agreement required'], help: ['Masters and skills', 'Stores and possible equipment', 'Community knowledge'] },
  circle: { label: 'Circle · Together', title: 'Our workshop vision', status: 'Discussing', opening: 'What might the group build together? Each proposal stays a proposal until the Circle decides.', facts: ['Collect members’ ideas', 'Explore places and supplies', 'Group decisions require authority'], help: ['Mentors and apprenticeships', 'Relevant Stores', 'Community projects'] },
  community: { label: 'Community · Trust Project', title: 'Good things happen together', status: 'LIVE', opening: 'Would you like to learn, contribute your skills or find a Circle?', facts: ['Conversations and belonging', 'Projects and events', 'Verified work and impact'], help: ['Discover Circles', 'Take part in a project', 'Learn from a Master'] },
};
export function Phase1LivingWorkspacePreview() {
  const [mode, setMode] = useState<Mode>('work');
  const [screen, setScreen] = useState<Screen>('chat');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState('People & Invitations');
  const [drafts, setDrafts] = useState<Record<Mode, string>>({ work:'', vision:'', circle:'', community:'' });
  const [messages, setMessages] = useState<Record<Mode, string[]>>({ work:[], vision:[], circle:[], community:[] });
  const current = scenarios[mode];
  const tool = tools.find(t => t.name === activeTool) ?? tools[0];
  function openTool(name: string) { setActiveTool(name); setToolsOpen(true); setScreen('tools'); }
  function closeTool() { setToolsOpen(false); setScreen('chat'); }
  function send() {
    const value = drafts[mode].trim();
    if (!value) return;
    setMessages(previous => ({ ...previous, [mode]: [...previous[mode], value] }));
    setDrafts(previous => ({ ...previous, [mode]: '' }));
  }
  return <main className="min-h-screen bg-cream-50 text-forest-800">
    <header className="border-b border-cream-200 bg-white/90 px-4 py-3 sm:px-7">
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-3">
        <div><strong className="text-xl tracking-tight">SecurePay</strong><p className="text-xs text-sand-600">Living workspace · Phase 1 preview</p></div>
        <nav aria-label="Workspace experience" className="flex max-w-full rounded-xl bg-cream-100 p-1">
          {([['work','My Work'],['vision','Vision'],['circle','Circle'],['community','Community']] as const).map(([id,label]) =>
            <button key={id} aria-current={mode===id?'page':undefined} onClick={()=>{setMode(id);setScreen('chat');setToolsOpen(false);}} className={`min-h-11 rounded-lg px-3 text-xs sm:px-5 sm:text-sm ${mode===id?'bg-white font-semibold shadow-sm':'text-sand-600'}`}>{label}</button>)}
        </nav>
        <a className="inline-flex min-h-11 items-center gap-2 text-sm underline" href="#/"><ArrowLeft size={15}/> Exit preview</a>
      </div>
    </header>
    <div className="mx-auto flex max-w-[1550px] gap-3 px-3 py-3 sm:px-5 sm:py-5">
      {toolsOpen && <aside aria-label="Contextual tools" className={`${screen==='tools'?'flex':'hidden'} w-full shrink-0 flex-col rounded-2xl border border-cream-200 bg-white md:flex md:w-[225px] xl:w-[250px]`}>
        <div className="flex items-center justify-between border-b border-cream-100 p-4"><strong>Tools</strong><button aria-label="Close tools" onClick={closeTool} className="rounded-lg p-2 hover:bg-cream-100"><X size={19}/></button></div>
        <div className="max-h-[65vh] overflow-auto p-3">{tools.map(t=><button key={t.name} onClick={()=>setActiveTool(t.name)} className={`flex min-h-11 w-full items-center gap-2 rounded-xl p-3 text-left text-xs ${activeTool===t.name?'bg-forest-50 font-semibold':'hover:bg-cream-100'}`}><t.icon size={17}/>{t.name}</button>)}</div>
        <div className="m-3 rounded-xl bg-cream-100 p-4 text-sm"><strong>{tool.name}</strong><p className="mt-2 text-sand-700">{tool.description}</p><p className="mt-3 text-xs text-sand-600">Phase 1 preview: no external action or private data sharing is performed here.</p></div>
      </aside>}
      <section aria-label="KS001 conversation" className={`${screen==='chat'?'flex':'hidden'} min-h-[72vh] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white md:flex`}>
        <div className="flex items-center justify-between border-b border-cream-100 p-4"><div><p className="text-xs text-sand-600">{current.label}</p><strong className="text-lg">KS001</strong></div><button onClick={()=>openTool(activeTool)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cream-100 px-4 text-sm"><Plus size={18}/> Add / Tools</button></div>
        <div className="flex-1 space-y-4 p-5"><p className="max-w-[560px] text-sm leading-7">{current.opening}</p>{messages[mode].map((m,i)=><p key={i} className="ml-auto max-w-[80%] rounded-2xl bg-cream-100 p-4 text-sm">{m}</p>)}{messages[mode].length>0&&<p role="status" className="text-sm text-sand-600">Message displayed in preview. Live KS001 orchestration is not connected here.</p>}</div>
        <form className="flex gap-2 border-t border-cream-100 p-3" onSubmit={e=>{e.preventDefault();send();}}><input aria-label="Message KS001" className="min-w-0 flex-1 rounded-xl border border-cream-200 bg-cream-50 px-3 py-3 text-sm" value={drafts[mode]} onChange={e=>setDrafts(previous=>({...previous,[mode]:e.target.value}))} placeholder="Talk to KS001…"/><button aria-label="Send" className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white">Send</button></form>
      </section>
      <aside aria-label="Living result" className={`${screen==='result'?'flex':'hidden'} w-full min-w-0 flex-col rounded-2xl border border-cream-200 bg-white md:flex md:w-[35%] lg:max-w-[460px]`}>
        <div className="p-5"><p className="text-xs uppercase tracking-wider text-sand-600">Living result</p><div className="mt-3 flex items-center justify-between gap-2"><h2 className="font-display text-xl">{current.title}</h2><span className="rounded-full bg-cream-100 px-2 py-1 text-xs">{current.status}</span></div><div className="mt-5 space-y-3">{current.facts.map(f=><p key={f} className="border-b border-cream-100 pb-3 text-sm">{f}</p>)}</div>
        <div className="mt-8 rounded-xl bg-cream-100 p-4"><div className="flex items-center gap-2 font-semibold"><HeartHandshake size={17}/> SecurePay Helps</div>{current.help.map(h=><p key={h} className="mt-3 text-sm text-sand-700">{h}</p>)}</div>
        <div className="mt-4 rounded-xl border border-cream-200 p-4"><strong className="text-sm">Community Saver</strong><p className="mt-2 text-xs text-sand-600">Opportunities require a Plug, verification and informed consent. Suggestions do not change Agreements.</p></div></div>
      </aside>
    </div>
    <nav aria-label="Mobile workspace panels" className="sticky bottom-0 flex justify-around gap-2 border-t border-cream-200 bg-white p-2 md:hidden">{([['chat','Chat',MessageCircle],['result','Your Work',Lightbulb],['tools','Tools',Wrench]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>id==='tools'?openTool(activeTool):setScreen(id)} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs ${screen===id?'bg-forest-800 text-white':'bg-cream-100'}`}><Icon size={16}/>{label}</button>)}</nav>
    <p className="px-5 pb-4 text-center text-xs text-sand-600">Visual shell only. No money, invitation, approval, booking or Agreement authority is active in this preview.</p>
  </main>;
}
