import { LivingCommunityPanel } from './LivingCommunityPanel';
import { LivingVisionPanel } from './LivingVisionPanel';
import { LivingCirclePanel } from './LivingCirclePanel';
import { useState } from 'react';
import { ArrowRight, CircleCheck, FileText, Lightbulb, Users, HeartHandshake, ShieldAlert } from 'lucide-react';

/**
 * Preview-only, in-memory fixture. It is neither an authenticated identity
 * nor a set of SecurePay backend records. Do not pass its values to gateways.
 */
type Mode = 'work' | 'vision' | 'circle' | 'community';
type DemoItem = { id: string; title: string; eyebrow: string; detail: string; next: string; facts: readonly string[] };
const DEMO_ITEMS: Record<Mode, readonly DemoItem[]> = {
  work: [
    { id:'shoe', title:'Shoes for Ray', eyebrow:'SAMPLE · forming Agreement', detail:'A sample KES 4,000 purchase. The supplier, handover and conditions for payment still need to be established.', next:'Clarify the seller and how Ray receives the shoes', facts:['Item: shoes for Ray','Price proposed: KES 4,000','Seller: not yet identified','Payment: not authorised or moved'] },
    { id:'chairs', title:'200 chairs for a school', eyebrow:'SAMPLE · draft', detail:'An example of work that needs delivery responsibilities, dates, receiving evidence and party agreement before Money.', next:'Confirm the supplier, delivery and acceptance', facts:['Quantity: 200 chairs','Receiving school: to be verified','Delivery: not agreed','Money: not ready'] },
  ],
  vision: [
    { id:'workshop', title:'My workshop dream', eyebrow:'SAMPLE · personal Vision', detail:'A private idea board with inspiration, notes and a future goal. No Agreement is required to explore.', next:'Add a sketch, supplier idea or note', facts:['Ideas collected: workshop layout and equipment','Costs: being explored, not quoted','Visibility: personal demonstration only'] },
    { id:'tank', title:'Rainwater storage project', eyebrow:'SAMPLE · exploring', detail:'A possible community-benefit project with locations, material options and skills to investigate.', next:'Explore options before making promises', facts:['Purpose: rainwater storage','Location: not established','People and funding: not invited'] },
  ],
  circle: [
    { id:'builders', title:'Workshop Circle', eyebrow:'SAMPLE · Circle discussion', detail:'Members explore a shared idea. Contributions are proposals until the group follows its real governance.', next:'Ask for member perspectives before deciding', facts:['Members: illustrative only','Ideas: not decisions','Permissions: no real Circle access'] },
    { id:'garden', title:'Neighbourhood Garden Circle', eyebrow:'SAMPLE · planning', detail:'A group considers a garden day and its responsibilities; this is not a real invitation or event.', next:'Propose a plan for members to consider', facts:['Project: community garden','Participation: illustrative','No one has accepted obligations'] },
  ],
  community: [
    { id:'learning', title:'Learning with a Master', eyebrow:'SAMPLE · community opportunity', detail:'See how training, mentoring and apprenticeships might appear once membership is actually confirmed.', next:'Explore learning opportunities', facts:['Host: not a real listing','Availability: not confirmed','Membership: not created by this demo'] },
    { id:'project', title:'A day of shared work', eyebrow:'SAMPLE · community project', detail:'People can discover practical projects and contribute skills. This card is not a real project.', next:'Explore a future volunteer opportunity', facts:['Date: not scheduled','Location: not established','No real participants or commitments'] },
  ],
};
const META: Record<Mode,{label:string;icon:typeof FileText}> = {
  work:{label:'My Work',icon:FileText},
  vision:{label:'Vision',icon:Lightbulb},
  circle:{label:'Circle',icon:Users},
  community:{label:'Community',icon:HeartHandshake},
};

export function MockWorkspacePanel({area}:{area:Mode}) {
  const [selected,setSelected] = useState<string|null>(null);
  const items=DEMO_ITEMS[area];
  const active=items.find(x=>x.id===selected)??null;
  const Icon=META[area].icon;
  return <section aria-label={'Demo '+META[area].label} data-mock-workspace className="space-y-4">
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-950"><ShieldAlert size={17}/> Demonstration account</p>
      <p className="mt-1 text-xs leading-5 text-amber-900">You're exploring a simulated signed-in experience. These are sample records, not your SecurePay data. No account, membership, permission, Money or Agreement is created.</p>
    </div>
    <div className="flex items-center gap-2">
      <Icon size={19}/>
      <div><p className="text-xs uppercase tracking-wider text-sand-600">Demo member · KS-DEMO-001</p>
        <h2 className="font-display text-xl">{META[area].label}</h2></div>
    </div>
    <p className="text-sm text-sand-700">{area==='work'?'A sample of how your Agreements and saved work will appear after real authentication.':area==='vision'?'Personal dreams stay private until you choose to share them.':area==='circle'?'Circle decisions and access will follow real membership and governance.':'Community participation is separate from signing into SecurePay.'}</p>
    <div className="space-y-2">
      {items.map(item=><article key={item.id} className="rounded-xl border border-cream-200 p-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-sand-600">{item.eyebrow}</p>
        <p className="mt-1 text-sm font-semibold">{item.title}</p>
        <button type="button" onClick={()=>setSelected(v=>v===item.id?null:item.id)}
          aria-expanded={active?.id===item.id}
          className="mt-2 flex min-h-11 items-center gap-2 rounded-lg bg-cream-100 px-3 text-xs">
          {active?.id===item.id?'Close sample':'Open sample'} <ArrowRight size={14}/>
        </button>
      </article>)}
    </div>
    {active&&<div className="rounded-xl border border-cream-200 bg-cream-50 p-4" role="region" aria-label={'Sample '+active.title}>
      <p className="text-xs font-semibold text-sand-600">SIMULATED RECORD · NOT SAVED</p>
      <h3 className="mt-1 font-display text-lg">{active.title}</h3>
      <p className="mt-2 text-sm leading-6">{active.detail}</p>
      <div className="mt-3 space-y-2">{active.facts.map(f=><p key={f} className="text-xs text-sand-700">{f}</p>)}</div>
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-white p-3 text-xs"><CircleCheck size={16} className="shrink-0"/> Next to explore: {active.next}</p>
      {area==='vision'&&<div className="mt-4 rounded-xl bg-white p-3" data-mock-vision-tools>
        <p className="mb-3 text-xs font-semibold text-amber-900">DEMO TOOLS — local exploration, never saved</p>
        <LivingVisionPanel/>
      </div>}
      {area==='community'&&<div className="mt-4 rounded-xl bg-white p-3" data-mock-community-tools>
        <p className="mb-3 text-xs font-semibold text-amber-900">DEMO COMMUNITY — projects, sessions and interest are examples only</p>
        <LivingCommunityPanel/>
      </div>}
      {area==='circle'&&<div className="mt-4 rounded-xl bg-white p-3" data-mock-circle-tools>
        <p className="mb-3 text-xs font-semibold text-amber-900">DEMO CIRCLE — pretend members and proposals only</p>
        <LivingCirclePanel/>
      </div>}
      <p className="mt-2 text-xs text-sand-600">Actions are intentionally illustrative. Sign in with a real KS Number to see or change actual records.</p>
    </div>}
    <p className="text-xs text-sand-600">Sample state lasts only while this preview is open. Refreshing resets the mock sign-in; no sample data is stored or sent to SecurePay.</p>
  </section>;
}
