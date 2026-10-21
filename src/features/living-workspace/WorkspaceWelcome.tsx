import { CalendarCheck2, Camera, FileText, MapPin, Sparkles, type LucideIcon } from 'lucide-react';
import type { Ks001WorkspaceMode } from './personas';
import { workspacePurpose } from './workspacePurpose';
type WelcomeExample = { label:string; help:string; icon:LucideIcon; prompt:string; tool:'Photos'|'Documents'|'Places'|null };
const examples:Record<Ks001WorkspaceMode,WelcomeExample[]> = {
  work:[
    {label:'A delivery',help:'Who, where and when?',icon:MapPin,prompt:'Help me prepare an Agreement for a delivery.',tool:null},
    {label:'A job',help:'Work, price and milestones',icon:FileText,prompt:'I need an Agreement for some work at home.',tool:null},
    {label:'A group plan',help:'People and responsibilities',icon:CalendarCheck2,prompt:'Help me organise a group contribution fairly.',tool:null},
  ],
  vision:[
    {label:'Collect inspiration',help:'Bring a picture',icon:Camera,prompt:'',tool:'Photos'},
    {label:'A written plan',help:'Start with a document',icon:FileText,prompt:'',tool:'Documents'},
    {label:'Imagine a place',help:'Bring the location',icon:MapPin,prompt:'',tool:'Places'},
  ],
  circle:[
    {label:'Share a plan',help:'Bring the proposal',icon:FileText,prompt:'',tool:'Documents'},
    {label:'Organise a place',help:'Record where',icon:MapPin,prompt:'',tool:'Places'},
    {label:'Show what matters',help:'Bring a photograph',icon:Camera,prompt:'',tool:'Photos'},
  ],
  community:[
    {label:'A project',help:'Bring its story',icon:FileText,prompt:'',tool:'Documents'},
    {label:'A place to help',help:'Explore location',icon:MapPin,prompt:'',tool:'Places'},
    {label:'Share evidence',help:'Add a picture',icon:Camera,prompt:'',tool:'Photos'},
  ],
};
// The work entry keeps its established KS001 introduction. The other areas
// take their purpose and boundary wording from the approved shared model.
const workWords = { title:'What would you like to get done?',
  intro:'Tell me what you’re planning. We can make the responsibilities, dates, evidence and next steps clear together.' };
/** An empty state inside an existing workspace, never a second Home or a fictitious work record. */
export function WorkspaceWelcome({area,onExample}:{
  area:Ks001WorkspaceMode;onExample:(example:{prompt:string;tool:WelcomeExample['tool']})=>void;
}){
  const purpose=area==='work'?null:workspacePurpose(area);
  const content=purpose??workWords;
  return <section aria-label={area+' welcome'} data-workspace-welcome={area} className="mx-auto w-full max-w-2xl px-1 py-5 sm:py-10">
    <div aria-hidden="true" className="mb-7 flex items-center gap-3 text-forest-600">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-forest-200 bg-[#eef4e9] shadow-sm"><Sparkles size={23}/></div>
      <span className="h-px w-16 bg-forest-200"/><span className="h-2.5 w-2.5 rounded-full bg-[#a3c0ab]"/>
    </div>
    <h1 className="sp-type-display max-w-lg text-[2.1rem] leading-tight tracking-tight text-forest-900 sm:text-[2.55rem]">{content.title}</h1>
    <p className="mt-4 max-w-xl text-sm leading-7 text-sand-700 sm:text-base">{content.intro}</p>
    <p className="mt-9 mb-3 text-[0.69rem] font-semibold uppercase tracking-[0.17em] text-forest-700">Perhaps start with</p>
    <div className="grid gap-2 sm:grid-cols-3">
      {examples[area].map((example)=>{
        const Icon=example.icon;
        return <button type="button" key={example.label} onClick={()=>onExample({prompt:example.prompt,tool:example.tool})}
          className="group min-h-28 rounded-2xl border border-cream-200 bg-white/85 p-4 text-left shadow-[0_10px_28px_-24px_rgba(30,70,40,.4)] transition-colors hover:border-forest-200 hover:bg-[#f8fbf5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-700 motion-reduce:transition-none">
          <Icon size={20} className="text-forest-700" aria-hidden="true"/>
          <strong className="mt-3 block text-sm text-forest-900">{example.label}</strong>
          <span className="mt-1 block text-xs leading-5 text-sand-600">{example.help}</span>
        </button>;
      })}
    </div>
    <p className="mt-6 text-xs leading-5 text-sand-600">
      {area==='work'?'Nothing becomes an Agreement until it has been reviewed and accepted.':purpose?.boundary}
    </p>
  </section>;
}
