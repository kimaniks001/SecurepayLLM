import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, BedDouble, CalendarDays, Camera, FileText, MapPin,
  Plus, Store, UserRoundPlus, Wallet, X, Image as ImageIcon, FileSpreadsheet,
  ClipboardPaste, type LucideIcon,
} from 'lucide-react';
import { QuickSupportPanel, type QuickAssistId } from '../living-workspace/QuickSupportPanel';
import { PeopleInvitationsTool } from '../living-workspace/PeopleInvitationsTool';

/**
 * Real KS001 tools. The preview tray provided the visual pattern, NOT a source
 * of mock Agreements, prices, providers or permissions.
 *
 * Every selectable item has a real next step: source upload, a context editor,
 * KS001 proposal or the canonical signed-in Store/Money route.
 */
type ToolName = 'Photos'|'Documents'|'Places'|'Date & Time'|'Quick Assist'|'Stores'|'People & Invitations'|'Money';
const options: Array<{name:ToolName; description:string; group:'add'|'do'; icon:LucideIcon}> = [
  {name:'Photos', description:'Show what you mean, or capture evidence', group:'add',icon:Camera},
  {name:'Documents',description:'Bring a document, spreadsheet or plan',group:'add',icon:FileText},
  {name:'Places',description:'Add the location that matters',group:'add',icon:MapPin},
  {name:'Date & Time',description:'Milestones, delivery, dates and conditions',group:'add',icon:CalendarDays},
  {name:'Quick Assist',description:'Short Stays, My Ride and quick documents',group:'do',icon:BedDouble},
  {name:'Stores',description:'Find real goods and services',group:'do',icon:Store},
  {name:'People & Invitations',description:'Prepare who should be involved',group:'do',icon:UserRoundPlus},
  {name:'Money',description:'My Money, borrow, invest or protect',group:'do',icon:Wallet},
];
const imgAccept='image/jpeg,image/png';
const docsAccept='.pdf,.docx,.txt,.md,.csv,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function WorkspaceToolTray({disabled=false,onPhoto,onDocument,onPlan,onPlace,onDateTime,onStores,onMoney,onPrepare,agreementPeople=[]}:{
  disabled?:boolean;
  onPhoto:(file:File)=>void; onDocument:(file:File)=>void; onPlan:()=>void;
  onPlace:()=>void; onDateTime:()=>void; onStores:()=>void; onMoney:()=>void;
  onPrepare:(request:string)=>Promise<void>; agreementPeople?:string[];
}){
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<ToolName|null>(null);
  const [quickTools,setQuickTools]=useState<QuickAssistId[]>([]);
  const inputPhoto=useRef<HTMLInputElement>(null);
  const inputCamera=useRef<HTMLInputElement>(null);
  const inputDocument=useRef<HTMLInputElement>(null);
  const inputSpreadsheet=useRef<HTMLInputElement>(null);
  const launcher=useRef<HTMLButtonElement>(null);
  const dialog=useRef<HTMLDivElement>(null);
  const dismiss=()=>{setOpen(false);setSelected(null);launcher.current?.focus();};
  useEffect(()=>{
    if(!open)return;
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();dismiss();}};
    document.addEventListener('keydown',key);
    return()=>document.removeEventListener('keydown',key);
  },[open]);
  const openSelection=(name:ToolName)=>{
    if(name==='Places'){dismiss();onPlace();return;}
    if(name==='Date & Time'){dismiss();onDateTime();return;}
    if(name==='Stores'){dismiss();onStores();return;}
    if(name==='Money'){dismiss();onMoney();return;}
    setSelected(name);
  };
  const selectUpload=(kind:'photo'|'camera'|'document'|'spreadsheet')=>{
    const file={photo:inputPhoto,camera:inputCamera,document:inputDocument,spreadsheet:inputSpreadsheet}[kind];
    file.current?.click();
  };
  const handle=(kind:'photo'|'document')=>(event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    dismiss();
    if(kind==='photo')onPhoto(file);else onDocument(file);
  };
  const execute=async(message:string)=>{await onPrepare(message);dismiss();};
  return <div data-workspace-tool-tray className="inline-flex">
    <button ref={launcher} type="button" disabled={disabled} onClick={()=>{setSelected(null);setOpen(true);}}
      aria-label="Add or use a tool" aria-haspopup="dialog" aria-expanded={open}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl text-forest-800 hover:bg-cream-100 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-700">
      <Plus size={22} aria-hidden="true"/><span className="sr-only">Tools</span>
    </button>
    <input ref={inputPhoto} className="hidden" type="file" accept={imgAccept} aria-label="Upload a photo" onChange={handle('photo')}/>
    <input ref={inputCamera} className="hidden" type="file" accept={imgAccept} capture="environment" aria-label="Take a photo" onChange={handle('photo')}/>
    <input ref={inputDocument} className="hidden" type="file" accept={docsAccept} aria-label="Upload document" onChange={handle('document')}/>
    <input ref={inputSpreadsheet} className="hidden" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" aria-label="Upload spreadsheet" onChange={handle('document')}/>
    {open && <>
      <button type="button" className="fixed inset-0 z-[79] cursor-default bg-forest-950/30 backdrop-blur-[2px]" aria-label="Close tools overlay" onClick={dismiss}/>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label={selected?selected+' tool':'Choose a tool'}
        data-workspace-tool-dialog
        className="fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[89dvh] min-w-0 flex-col overflow-hidden rounded-t-[1.8rem] border border-forest-100 bg-[#fffefa] shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(94vw,640px)] sm:max-h-[min(89dvh,920px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.8rem]">
        <header className="flex items-center justify-between gap-3 border-b border-forest-100 px-5 py-4 sm:px-6">
          {selected
            ? <button type="button" onClick={()=>setSelected(null)} className="flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-forest-800"><ArrowLeft size={18}/> All tools</button>
            : <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-forest-600">KS001 · Workspace</p>
               <h2 className="font-display text-xl text-forest-900">Add or use a tool</h2></div>}
          <button type="button" aria-label="Close tools" onClick={dismiss} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-cream-100"><X size={20}/></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {!selected ? <div className="space-y-6">
            <p className="max-w-lg text-[0.85rem] leading-6 text-sand-700">Bring something to your work, or get practical help. KS001 and your Agreement stay in the same place.</p>
            {(['add','do'] as const).map(group=><section key={group} aria-label={group==='add'?'Add something':'Get something done'}>
              <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-forest-700">{group==='add'?'Add something':'Get something done'}</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {options.filter(t=>t.group===group).map(({name,icon:Icon,description})=><button type="button" key={name} onClick={()=>openSelection(name)}
                  className="group flex min-h-28 flex-col justify-between gap-3 rounded-[1.2rem] border border-forest-100 bg-white/90 p-3.5 text-left shadow-[0_8px_20px_-18px_rgba(27,60,38,.7)] transition-colors hover:border-forest-300 hover:bg-forest-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800 sm:min-h-32 sm:p-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700"><Icon size={22}/></span>
                  <span><strong className="block text-[0.87rem] text-forest-900">{name}</strong><span className="mt-1 block text-[0.75rem] leading-5 text-sand-600">{description}</span></span>
                </button>)}
              </div>
            </section>)}
            <p className="border-t border-forest-100 pt-3 text-[0.77rem] leading-5 text-sand-600">Adding material helps KS001 understand. It never accepts an Agreement, invites someone or moves money by itself.</p>
          </div> : selected==='Photos' ? <section className="space-y-3" aria-label="Photos workspace">
            <p className="text-sm leading-6 text-sand-700">Show the item, work, delivery or place. A photo can help explain without typing everything.</p>
            <button onClick={()=>selectUpload('photo')} className="flex min-h-16 w-full items-center gap-4 rounded-xl border border-forest-200 bg-white p-4 text-left"><ImageIcon size={22}/> Choose a photo (JPG or PNG)</button>
            <button onClick={()=>selectUpload('camera')} className="flex min-h-16 w-full items-center gap-4 rounded-xl border border-forest-200 bg-white p-4 text-left"><Camera size={22}/> Take a photo</button>
            <p className="text-xs text-sand-600">The actual SecurePay source reader will confirm if it can use the photo. Location metadata is not required for this choice.</p>
          </section> : selected==='Documents' ? <section className="space-y-3" aria-label="Documents workspace">
            <p className="text-sm leading-6 text-sand-700">Bring meeting minutes, a quote, a spreadsheet or a prepared plan. SecurePay keeps the source visible while it is being read.</p>
            <button onClick={()=>selectUpload('document')} className="flex min-h-16 w-full items-center gap-4 rounded-xl border border-forest-200 bg-white p-4 text-left"><FileText size={22}/> Choose document</button>
            <button onClick={()=>selectUpload('spreadsheet')} className="flex min-h-16 w-full items-center gap-4 rounded-xl border border-forest-200 bg-white p-4 text-left"><FileSpreadsheet size={22}/> Choose spreadsheet</button>
            <button onClick={()=>{dismiss();onPlan();}} className="flex min-h-16 w-full items-center gap-4 rounded-xl border border-forest-200 bg-white p-4 text-left"><ClipboardPaste size={22}/> Paste a plan or notes</button>
          </section> : selected==='Quick Assist' ? <QuickSupportPanel collection={quickTools} onCollectionChange={setQuickTools}
            onFindStoreOffers={()=>{dismiss();onStores();}} onContinue={execute}/>
          : selected==='People & Invitations' ? <PeopleInvitationsTool onPrepare={execute} agreementPeople={agreementPeople}/>
          : <p role="status" className="text-sm text-sand-700">Choose another tool to continue.</p>}
        </div>
      </div>
    </>}
  </div>;
}
