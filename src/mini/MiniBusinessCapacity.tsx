import { useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, ChevronDown, ChevronRight, LockKeyhole, MessageCircle, Package, Plus, Settings2, ShieldCheck, Store, UserRound, X } from 'lucide-react';
import type { MiniLanguage } from './miniModel';
import { listed, amount, type BusinessDemo } from './MiniBusinessDemoModel';

export type MiniPreviewCapacity = 'business' | 'personal';
type AddChoice = 'another-ks' | 'existing-business' | 'new-business';
type AddStage = 'select' | 'details' | 'next';
const addOptions: { id: AddChoice; title: string; detail: string; icon: typeof UserRound }[] = [
  { id: 'another-ks', title: 'Use another KSNumber', detail: 'Sign in to a KSNumber you own', icon: UserRound },
  { id: 'existing-business', title: 'Connect an existing Business', detail: 'A Business you are authorised to represent', icon: BriefcaseBusiness },
  { id: 'new-business', title: 'Create a new Business', detail: 'SecurePay issues a Business KSNumber', icon: Plus },
];


/**
 * A read-only owner review of how acting for a Business could feel in the
 * existing SecurePay Mini. Never treats this local choice as verified
 * representation. Real Business scope and Inbox visibility remain server-owned.
 */
export function MiniBusinessCapacity({
  language, capacity, onChange, onStartSelling, onAskKs001, onOpenSettings, onOpenStore, demo, part
}: {
  language: MiniLanguage;
  capacity: MiniPreviewCapacity;
  onChange: (next: MiniPreviewCapacity) => void;
  onStartSelling: () => void;
  onAskKs001: () => void;
  onOpenSettings: () => void;
  onOpenStore: () => void;
  demo: BusinessDemo;
  part: 'identity' | 'activity';
}) {
  const [chooseOpen, setChooseOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addChoice, setAddChoice] = useState<AddChoice | null>(null);
  const [addStage, setAddStage] = useState<AddStage>('select');
  const [draftInput, setDraftInput] = useState('');
  const closeAdd = () => {
    setAdding(false);
    setAddChoice(null);
    setDraftInput('');
    setAddStage('select');
  };
  const closeMenu = () => { setChooseOpen(false); closeAdd(); };
  const beginAdd = () => { setAdding(true); setAddChoice(null); setDraftInput(''); setAddStage('select'); };
  const selectedAdd = addOptions.find(x => x.id === addChoice);

  const [openSection, setOpenSection] = useState<'work'|'store'|null>('work');
  const [selectedTask, setSelectedTask] = useState<string|null>(null);
  const isSw = language === 'sw';
  const business = capacity === 'business';
  const exampleTasks=[
    ...demo.enquiries.filter(q=>q.status==='new').map(q=>({
      id:q.id,title:demo.offers.find(o=>o.id===q.offerId)?.title||'Customer enquiry',
      state:'Buyer enquiry',detail:q.question,next:'Open Business Settings → My Store → Enquiries to prepare terms.'
    })),
    ...demo.agreements.map(a=>({
      id:a.id,title:demo.offers.find(o=>o.id===a.offerId)?.title||'Living Agreement',
      state:a.state.replace('_',' '),detail:'Example Agreement '+a.id+' · '+amount(a.quantity*a.unitPrice),
      next:'Open Business Settings → Living Agreements to review its next stage.'
    }))
  ];
  const selected = exampleTasks.find(t=>t.id === selectedTask);
  return <>
    {part === 'identity' && <div className="spm-business-capacity">
      <button type="button" className="spm-business-switch" aria-expanded={chooseOpen} onClick={()=>{ if(chooseOpen) closeMenu(); else setChooseOpen(true); }}>
        <span className="spm-business-switch-icon">{business?<BriefcaseBusiness size={16}/>:<UserRound size={16}/>}</span>
        <span className="spm-business-switch-text">
          <small>{isSw?'Unafanya kazi kama':'You’re acting as'}</small>
          <strong>{business?demo.name:isSw?'Wewe binafsi':'Yourself · Personal'}</strong>
        </span>
        <ChevronDown size={16}/>
      </button>
      {chooseOpen && <div className="spm-business-choices" aria-label="Choose example acting capacity">
        {!adding ? <>
          <button type="button" onClick={()=>{onChange('personal');closeMenu();setSelectedTask(null);}}>
            <UserRound size={17}/><span>My personal KSNumber</span>{!business&&<Check size={16}/>}
          </button>
          <button type="button" onClick={()=>{onChange('business');closeMenu();}}>
            <Store size={17}/><span>{demo.name} · Business</span>{business&&<Check size={16}/>}
          </button>
          <div className="spm-business-choice-divider" />
          <button type="button" className="spm-business-add-trigger" onClick={beginAdd}>
            <Plus size={18}/><span>Add KSNumber or Business</span><ChevronRight size={15}/>
          </button>
          <p>Preview only. Switching here does not verify or connect an account.</p>
        </> : <>
          <div className="spm-business-add-header">
            <button type="button" aria-label="Go back" onClick={()=>{
              if(addStage==='next')setAddStage('details');
              else if(addStage==='details'){setAddStage('select');setDraftInput('');setAddChoice(null);}
              else closeAdd();
            }}><ArrowLeft size={17}/></button>
            <strong>{addStage==='select'?'Add KSNumber or Business':selectedAdd?.title}</strong>
            <button type="button" aria-label="Close" onClick={closeMenu}><X size={17}/></button>
          </div>
          {addStage==='select' && <>
            <p className="spm-business-add-intro">How would you like to continue?</p>
            {addOptions.map(option=> {
              const Icon=option.icon;
              return <button type="button" className="spm-business-add-option" key={option.id} onClick={()=>{setAddChoice(option.id);setAddStage('details');setDraftInput('');}}>
                <Icon size={17}/><span><strong>{option.title}</strong><small>{option.detail}</small></span><ChevronRight size={15}/>
              </button>;
            })}
          </>}
          {addStage==='details' && addChoice && <>
            <p className="spm-business-add-intro">
              {addChoice==='another-ks'
                ? 'An existing personal KSNumber requires its own secure sign-in. This does not merge identities or their private work.'
                : addChoice==='existing-business'
                  ? 'SecurePay must confirm your membership and permissions before this Business can appear in your switcher.'
                  : 'A new Business gets its own KSNumber when SecurePay accepts the creation request. It does not inherit payment authority.'}
            </p>
            <label className="spm-business-add-field">
              <span>{addChoice==='new-business'?'Business name':'KSNumber (example only)'}</span>
              <input value={draftInput} maxLength={addChoice==='new-business'?80:40}
                placeholder={addChoice==='new-business'?'For example: New Traders':'Example KSNumber (not your real one)'}
                onChange={e=>setDraftInput(e.target.value)}/>
            </label>
            <button type="button" className="spm-business-add-submit"
              disabled={!draftInput.trim()} onClick={()=>setAddStage('next')}>
              See the next step <ArrowRight size={15}/>
            </button>
            <small className="spm-business-add-safety">For this demonstration, please use invented details. Your entry stays on this page and is not submitted or saved.</small>
          </>}
          {addStage==='next' && addChoice && <>
            <div className="spm-business-add-result">
              <LockKeyhole size={22}/>
              <strong>{addChoice==='another-ks'?'Secure sign-in is required':addChoice==='existing-business'?'Business authority must be checked':'Business creation requires confirmation'}</strong>
              <p>{addChoice==='another-ks'
                ? 'In the connected application, SecurePay would authenticate that KSNumber separately. Your other identity would remain private and independent.'
                : addChoice==='existing-business'
                  ? 'SecurePay would check your actual representation rights. Only authorised Businesses would be added to your list.'
                  : 'You would review the Business details, confirm creation and receive a server-issued Business KSNumber. No real Business has been created here.'}</p>
              <small>No KSNumber or Business was added. This preview cannot verify identity, assign roles or create records.</small>
            </div>
            <button className="spm-business-add-submit" type="button" onClick={closeMenu}>Return to Mini <Check size={15}/></button>
          </>}
        </>}
      </div>}
    </div>}
    {part === 'identity' && business && <p className="spm-business-sample-note"><ShieldCheck size={13}/> Business example · not a signed-in account</p>}
    {part === 'identity' && !business && <p className="spm-business-sample-note"><ShieldCheck size={13}/> Personal example · not a signed-in account</p>}
    {part === 'activity' && business && <div className="spm-business-mini-helper">
      <div className="spm-business-heading">
        <span>{isSw?'Kwa biashara yako':'For your business'}</span>
        <span className="spm-business-little-tag">Examples</span>
      </div>
      <p className="spm-business-blurb">Nothing changes about how Mini works. When you need more, your business work opens here.</p>
      <button type="button" className="spm-business-reveal" aria-expanded={openSection === 'work'} onClick={()=>{setOpenSection(openSection==='work'?null:'work');setSelectedTask(null);}}>
        <MessageCircle size={17}/><span><strong>Things needing your attention</strong><small>{exampleTasks.length} sample enquiries and Agreements</small></span><ChevronRight size={16} className={openSection==='work'?'spm-business-down':''}/>
      </button>
      {openSection === 'work' && <div className="spm-business-expand">
        {exampleTasks.length===0 && <p className="spm-business-small-note">No pending example work. Open My Store to create a buyer enquiry.</p>}
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
        {demo.offers.map(item=><div key={item.id} className="spm-business-offer">
          <Package size={15}/><span><strong>{item.title}</strong><small>{listed(item)?'In sample customer view':'Hidden from sample buyers'} · {amount(item.price)} · stock {item.quantity}</small></span>
        </div>)}
        <button className="spm-business-text-link" type="button" onClick={onOpenStore}>Manage Store offers <ArrowRight size={14}/></button>
        <p className="spm-business-small-note">Store offers shown here are sample data, not verified stock or real prices.</p>
      </div>}
      <button type="button" className="spm-business-settings-line spm-business-settings-link"
        onClick={onOpenSettings} aria-label="Open Business Settings inside Mini">
        <Settings2 size={16}/>
        <span><strong>Business Settings</strong><small>Identity, staff, Store, KS001, integrations & billing</small></span>
        <ChevronRight size={16}/>
      </button>
    </div>}
  </>;
}
