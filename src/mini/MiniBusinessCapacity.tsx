import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Check, ChevronDown, ChevronRight, MessageCircle, Package, Settings2, ShieldCheck, Store, UserRound } from 'lucide-react';
import type { MiniLanguage } from './miniModel';

export type MiniPreviewCapacity = 'business' | 'personal';

const exampleTasks = [
  { id:'inquiry', title:'Solar lights for a guesthouse', state:'Customer needs a reply', detail:'A sample customer asks about two outdoor lights and delivery to a guesthouse. Confirm availability before offering any price or delivery promise.', next:'Confirm stock and offer to prepare a quotation.' },
  { id:'quote', title:'Cement for roof repairs', state:'Quotation being reviewed', detail:'A sample buyer is considering quantities, delivery and a proposed price. No acceptance has taken place.', next:'Check the buyer’s response before changing any terms.' },
  { id:'delivery', title:'Hardware delivery to Varsityville', state:'Work in progress', detail:'An illustrative Living Agreement is awaiting evidence of delivery and confirmation of completion.', next:'Review the delivery evidence with the parties.' },
] as const;

const sampleOffers = [
  { title:'Solar floodlight · 200W', detail:'Availability to confirm · Illustrative price KSh 8,500' },
  { title:'Cement · 50 kg', detail:'Availability to confirm · Illustrative price KSh 750' },
  { title:'Local hardware delivery', detail:'Price depends on place and the terms agreed' },
] as const;

/**
 * A read-only owner review of how acting for a Business could feel in the
 * existing SecurePay Mini. Never treats this local choice as verified
 * representation. Real Business scope and Inbox visibility remain server-owned.
 */
export function MiniBusinessCapacity({
  language, capacity, onChange, onStartSelling, onAskKs001
}: {
  language: MiniLanguage;
  capacity: MiniPreviewCapacity;
  onChange: (next: MiniPreviewCapacity) => void;
  onStartSelling: () => void;
  onAskKs001: () => void;
}) {
  const [chooseOpen, setChooseOpen] = useState(false);
  const [openSection, setOpenSection] = useState<'work'|'store'|null>('work');
  const [selectedTask, setSelectedTask] = useState<string|null>(null);
  const isSw = language === 'sw';
  const business = capacity === 'business';
  const selected = exampleTasks.find(t=>t.id === selectedTask);
  return <>
    <div className="spm-business-capacity">
      <button type="button" className="spm-business-switch" aria-expanded={chooseOpen} onClick={()=>setChooseOpen(v=>!v)}>
        <span className="spm-business-switch-icon">{business?<BriefcaseBusiness size={16}/>:<UserRound size={16}/>}</span>
        <span className="spm-business-switch-text">
          <small>{isSw?'Unafanya kazi kama':'You’re acting as'}</small>
          <strong>{business?'Kamakis Traders':isSw?'Wewe binafsi':'Yourself · Personal'}</strong>
        </span>
        <ChevronDown size={16}/>
      </button>
      {chooseOpen && <div className="spm-business-choices" aria-label="Choose example acting capacity">
        <button type="button" onClick={()=>{onChange('personal');setChooseOpen(false);setSelectedTask(null);}}><UserRound size={17}/><span>My personal KSNumber</span>{!business&&<Check size={16}/>}</button>
        <button type="button" onClick={()=>{onChange('business');setChooseOpen(false);}}><Store size={17}/><span>Kamakis Traders · Business</span>{business&&<Check size={16}/>}</button>
        <p>Illustrative switch only. A real Business must confirm that you can act for it.</p>
      </div>}
    </div>
    {business && <p className="spm-business-sample-note"><ShieldCheck size={13}/> Business example · not a signed-in account</p>}
    {!business && <p className="spm-business-sample-note"><ShieldCheck size={13}/> Personal example · not a signed-in account</p>}
    {business && <div className="spm-business-mini-helper">
      <div className="spm-business-heading">
        <span>{isSw?'Kwa biashara yako':'For your business'}</span>
        <span className="spm-business-little-tag">Examples</span>
      </div>
      <p className="spm-business-blurb">Nothing changes about how Mini works. When you need more, your business work opens here.</p>
      <button type="button" className="spm-business-reveal" aria-expanded={openSection === 'work'} onClick={()=>{setOpenSection(openSection==='work'?null:'work');setSelectedTask(null);}}>
        <MessageCircle size={17}/><span><strong>Things needing your attention</strong><small>3 sample enquiries and Agreements</small></span><ChevronRight size={16} className={openSection==='work'?'spm-business-down':''}/>
      </button>
      {openSection === 'work' && <div className="spm-business-expand">
        {exampleTasks.map(item=><button key={item.id} type="button" className={'spm-business-work-item'+(selectedTask===item.id?' selected':'')} onClick={()=>setSelectedTask(selectedTask===item.id?null:item.id)}>
          <span><strong>{item.title}</strong><small>{item.state}</small></span><ChevronRight size={14}/>
        </button>)}
        {selected && <div className="spm-business-detail">
          <strong>{selected.title}</strong>
          <p>{selected.detail}</p>
          <p><b>Next:</b> {selected.next}</p>
          <button type="button" onClick={onAskKs001}><MessageCircle size={15}/> Ask KS001 about this <ArrowRight size={14}/></button>
          <small>No live customer or Agreement record was opened.</small>
        </div>}
      </div>}
      <button type="button" className="spm-business-reveal" aria-expanded={openSection === 'store'} onClick={()=>{setOpenSection(openSection==='store'?null:'store');setSelectedTask(null);}}>
        <Store size={17}/><span><strong>Your Store</strong><small>Show offers and help buyers agree</small></span><ChevronRight size={16} className={openSection==='store'?'spm-business-down':''}/>
      </button>
      {openSection === 'store' && <div className="spm-business-expand">
        {sampleOffers.map(item=><div key={item.title} className="spm-business-offer">
          <Package size={15}/><span><strong>{item.title}</strong><small>{item.detail}</small></span>
        </div>)}
        <button className="spm-business-text-link" type="button" onClick={onStartSelling}>Start a seller draft <ArrowRight size={14}/></button>
        <p className="spm-business-small-note">Store offers shown here are sample data, not verified stock or real prices.</p>
      </div>}
      <div className="spm-business-settings-line">
        <Settings2 size={14}/><span>Business settings, networks and staff permissions live separately from everyday Mini.</span>
      </div>
    </div>}
  </>;
}
