import { useEffect, useState } from 'react';
import { SignatureAgreementTitle } from '../brand/SignatureAgreementTitle';
import type { FairTradeExaminationDto } from '../../api/securepay/agent/dto';
import type { FormationState } from '../formation/controller';
import type { FormationTerm } from '../formation/view';
import { compactAgreementFacts, livingFactStatus, humanNextQuestion } from './livingLanguage';
import { ArrowRight, CheckCircle2, RefreshCw, ShieldCheck, AlertCircle, Wallet, Plus } from 'lucide-react';

function Details({ title, terms }: { title:string; terms:FormationTerm[] }) {
  if (terms.length===0) return null;
  return <section className="border-b border-cream-100 py-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-sand-600">{title}</h3>
    <div className="mt-2 space-y-3">{terms.map(t=><div key={t.key}>
      <p className="text-xs font-semibold text-sand-600">{t.label}</p>
      <p className="mt-0.5 text-sm leading-6 text-forest-900">{t.value}</p>
      {t.detail && <p className="text-xs text-sand-700">{t.detail}</p>}
      {(t.needsChecking || t.basis==='INFERRED') && <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-1 text-[0.68rem] text-amber-900">{t.needsChecking?'Needs checking':'Inferred · please check'}</span>}
      {t.evidence.filter(e=>!e.removed).map((e,i)=><p key={i} className="mt-1 text-[0.7rem] text-sand-600">Source: {e.sourceName}{e.locator?' · '+e.locator:''}</p>)}
    </div>)}</div>
  </section>;
}

/** A small, faithful display projection, not a new Agreement fact source. */
function humanTitle(summary:string|null|undefined):string {
  if(!summary)return 'Your Agreement';
  const leading=summary.split(':')[0].trim();
  return (leading.length>=8 && leading.length<=72 ? leading : summary.slice(0,70)).trim();
}
export function LiveWorkResultPanel({ state, conversationId, busy, onRefresh, onCorrectFact, onAddToFact, examination }: {
  state: FormationState | null;
  conversationId: string | null;
  busy: boolean;
  onRefresh: () => void;
  onCorrectFact: (label:string, previous:string, replacement:string)=>Promise<void>;
  onAddToFact: (label:string)=>void;
  examination: { status:'idle'|'loading'|'ready'|'unavailable'; data:FairTradeExaminationDto|null };
}) {
  const [expanded,setExpanded]=useState(false);
  const [customTitle,setCustomTitle]=useState('');
  const [editingTitle,setEditingTitle]=useState(false);
  const [editingFact,setEditingFact]=useState<string|null>(null);
  const [factDraft,setFactDraft]=useState('');
  const [factSending,setFactSending]=useState(false);
  const [factError,setFactError]=useState<string|null>(null);
  useEffect(()=>{setCustomTitle('');setEditingTitle(false);setExpanded(false);setEditingFact(null);setFactDraft('');setFactError(null);},[conversationId]);
  const formation = state?.data?.conversationId === conversationId ? state.data : null;
  const fairTrade = formation && examination.status==='ready' && examination.data?.conversationId === conversationId && examination.data.tradeContextVersion === formation.version ? examination.data : null;
  const hasContent = formation && (formation.what.length>0 || formation.who.length>0 || formation.money.length>0 ||
    formation.when.length>0 || formation.responsibilities.some(g=>g.duties.length>0) ||
    formation.conditions.length>0 || formation.notIncluded.length>0);
  return <section aria-label="Live forming Agreement" data-live-formation className="space-y-4">
    <div className="sp-brand-work sticky top-0 z-20 flex items-start justify-between gap-3 bg-white pb-2">
      <div className="min-w-0 flex-1"><p className="sp-brand-kicker">My Work · Draft</p>
        {editingTitle?<form className="mt-2 flex gap-2" onSubmit={e=>{e.preventDefault();setEditingTitle(false);}}>
          <input autoFocus aria-label="Agreement display title" maxLength={80} value={customTitle} onChange={e=>setCustomTitle(e.target.value)} placeholder={humanTitle(formation?.summary)} className="min-w-0 flex-1 rounded-lg border border-cream-200 px-2 py-2 text-sm"/>
          <button type="submit" className="rounded-full bg-forest-800 px-3 text-sm text-white">Done</button>
        </form>:<div className="mt-1 flex items-start gap-2"><h2 className="min-w-0 font-display text-xl"><SignatureAgreementTitle title={customTitle.trim()||humanTitle(formation?.summary)}/></h2>
          <button type="button" onClick={()=>setEditingTitle(true)} className="shrink-0 rounded-full border border-cream-200 px-2 py-1 text-xs">Edit</button></div>}
        {customTitle&&<p className="text-xs text-sand-600">Display title for this preview only · not saved to the Agreement</p>}
      </div>
      <button type="button" onClick={onRefresh} disabled={!conversationId||busy||state?.status==='loading'} aria-label="Refresh Agreement from SecurePay" className="min-h-11 rounded-lg border border-cream-200 px-3 disabled:opacity-40"><RefreshCw size={17}/></button>
    </div>
    {expanded&&<p className="text-xs text-sand-600">Working draft · Not yet accepted</p>}
    {!conversationId && <div className="rounded-xl bg-cream-100 p-4 text-sm">Tell KS001 what you want to do. The Agreement will start appearing here as SecurePay understands it.</div>}
    {conversationId && busy && <p role="status" className="text-xs text-sand-600">KS001 is updating its understanding…</p>}
    {conversationId && state?.status==='loading' && <p role="status" className="text-xs text-sand-600">Reading the current Agreement from SecurePay…</p>}
    {conversationId && state?.status==='error' && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="flex gap-2 text-sm"><AlertCircle size={17}/> Couldn't refresh the Agreement: {state.error}</p>
      <p className="mt-2 text-xs">The previous version is not confirmed current. Try refreshing; chat messages and Agreement terms are not fabricated.</p>
    </div>}
    {formation && <div className="space-y-3">
      {expanded&&<div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-cream-100 px-3 py-1">{formation.question ? 'Draft · material question open' : formation.reviewable ? 'Draft review available · not qualified' : formation.stage==='BUILD'?'Forming':'Getting started'}</span><span className="text-sand-600">SecurePay version {formation.version}</span></div>}
      <section className="sticky top-[76px] z-10 rounded-xl border border-cream-200 bg-cream-50 p-3 shadow-sm" aria-label="Agreement summary">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Short draft Agreement summary. Check means a fact needs clarification, not that the Agreement is accepted.</caption>
          <tbody>
            {compactAgreementFacts(formation).map(item=><tr key={item.label} className="border-b border-cream-200 last:border-0">
              <th scope="row" className="w-[22%] py-2 pr-2 align-top text-xs font-medium text-sand-600">{item.label}</th>
              <td className="break-words py-2 align-top">
                {editingFact===item.label?<form className="space-y-2" onSubmit={async e=>{
                  e.preventDefault();const replacement=factDraft.trim();
                  if(!replacement||factSending||busy||replacement===item.value)return;
                  setFactSending(true);setFactError(null);
                  try {await onCorrectFact(item.label,item.value,replacement);setEditingFact(null);setFactDraft('');}
                  catch {setFactError('Could not confirm this correction. Check the conversation before retrying.');}
                  finally {setFactSending(false);}
                }}>
                  <textarea aria-label={'Correct '+item.label} rows={2} maxLength={600} value={factDraft} onChange={e=>setFactDraft(e.target.value)}
                    className="w-full rounded-lg border border-cream-200 bg-white p-2 text-sm"/>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={factSending||busy} onClick={()=>onAddToFact(item.label)}
                      aria-label={'Add photo, document, place or KS Number to '+item.label}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full border border-cream-200 bg-white px-3 text-xs font-semibold disabled:opacity-40">
                      <Plus size={15} aria-hidden="true"/> Add
                    </button>
                    <button type="submit" disabled={factSending||busy||!factDraft.trim()||factDraft.trim()===item.value} className="min-h-11 rounded-full bg-forest-800 px-3 py-2 text-xs text-white disabled:opacity-50">{factSending?'Sending…':'Send correction'}</button>
                    <button type="button" disabled={factSending} onClick={()=>setEditingFact(null)} className="min-h-11 rounded-full border border-cream-200 px-3 py-2 text-xs">Cancel</button></div>
                  <p className="text-xs leading-5 text-sand-600">Use Add to support this detail with a source. Your written correction stays here until you send it.</p>
                  {factError&&<p role="alert" className="text-xs text-amber-900">{factError}</p>}
                </form>:<div className="flex items-start justify-between gap-1">
                  <div><span title={item.reason||undefined}>{item.value}</span>
                    <span className={item.state!=='noted'?'ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900':'ml-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs text-sand-600'}>{livingFactStatus(item)}</span>
                  </div>
                  <button type="button" disabled={busy||factSending} aria-label={'Correct '+item.label} onClick={()=>{setEditingFact(item.label);setFactDraft(item.value);setFactError(null);}}
                    className="shrink-0 rounded-lg border border-cream-200 px-2 py-1 text-xs disabled:opacity-40">Edit</button>
                </div>}
              </td>
            </tr>)}
            {!compactAgreementFacts(formation).length&&<tr><td className="py-2 text-sm" colSpan={2}>Tell KS001 what you want to agree.</td></tr>}
          </tbody>
        </table>
        {formation.question&&<p className="mt-2 border-t border-cream-200 pt-2 text-sm"><span className="font-semibold">Next: </span>{humanNextQuestion(formation.question.text)}</p>}
        {!formation.question&&formation.reviewable&&<p className="mt-2 border-t border-cream-200 pt-2 text-sm">Draft ready to review.</p>}
      </section>
      <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} className="min-h-11 rounded-full border border-cream-200 px-4 text-sm font-semibold">{expanded?'Less':'More'}</button>
      {expanded&&<p className="text-sm text-sand-700">{formation.summary}</p>}
      {expanded&&<section aria-label="Fair Trade examination" className="rounded-xl border border-cream-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-sand-600">Guided by the 12 Principles of Fair Trade</p>
        {fairTrade ? <>
          <p className="mt-2 text-sm font-semibold">Partial examination · not qualified</p>
          <p className="mt-1 text-xs text-sand-700">Evidence-based observations for this Agreement version. Unexamined principles remain unassessed, not approved.</p>
          {fairTrade.findings.slice(0,3).map(f=><div key={f.principleNumber} className="mt-3 border-t border-cream-200 pt-2">
            <p className="text-xs font-semibold">{f.principleTitle} · {f.state==='MATERIAL_CONCERN'?'Material concern':'Needs clarification'}</p>
            <p className="mt-1 text-xs text-sand-700">{f.explanation}</p>
          </div>)}
          {!formation.question && fairTrade.advisoryQuestion && <div className="mt-3 rounded-lg bg-cream-100 p-3">
            <p className="text-xs font-semibold">One practical detail worth exploring with KS001</p>
            <p className="mt-2 text-sm">{fairTrade.advisoryQuestion}</p>
            <p className="mt-2 text-xs text-sand-700">Advisory only. It is not an extra required question or permission to move money.</p>
          </div>}
          {fairTrade.findings.length===0 && <p className="mt-2 text-xs text-sand-700">No assessed concerns to display yet. This is not a completed qualification.</p>}
        </> : <p className="mt-2 text-xs text-sand-700">{examination.status==='loading'?'Checking the current Agreement version…':'Formal Fair Trade examination is not yet available for this preview. Draft review is not qualification.'}</p>}
      </section>}
      {expanded && formation.money.length > 0 && <section aria-label="Money follows the Agreement" className="rounded-xl border border-cream-200 bg-cream-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Wallet size={17}/> Where will the money follow?</p>
        <p className="mt-2 text-sm leading-6 text-sand-700">The amount shown in this draft is not a payment instruction. The accepted Agreement establishes the parties and conditions; SecurePay Money must separately verify the payment destination.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-lg bg-white px-2 py-2">Agreement payer</span>
          <ArrowRight size={14} aria-hidden="true"/>
          <span className="rounded-lg bg-white px-2 py-2">Agreed conditions</span>
          <ArrowRight size={14} aria-hidden="true"/>
          <span className="rounded-lg bg-white px-2 py-2">Payee verified in Money</span>
        </div>
        <p className="mt-3 text-xs text-sand-600">The person receiving the item is not automatically the payee. After Agreement acceptance, SecurePay Money must confirm the entitled payee, verified payment destination and supported rail. Money cannot be initiated from this preview.</p>
      </section>}
      {expanded && formation.reviewable && !formation.question && <section aria-label="Draft review availability" className="rounded-xl border border-cream-200 p-4">
        <p className="text-sm font-semibold">A draft is available to review</p>
        <p className="mt-2 text-xs leading-5 text-sand-700">Draft review is not Fair Trade qualification, the other party’s acceptance, or readiness to move money. SecurePay will examine applicable practical and fairness concerns through its authorised backend before claiming a qualified Agreement.</p>
      </section>}
      {expanded && state?.changes.length ? <div role="status" className="rounded-xl border border-cream-200 bg-cream-50 p-3"><p className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 size={16}/> Updated with your conversation</p>{state.changes.map(t=><p key={t} className="mt-1 text-xs">{t}</p>)}</div>:null}
      {expanded && hasContent ? <>
        <Details title="What" terms={formation.what}/>
        {formation.who.length>0 && <section className="border-b border-cream-100 py-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-sand-600">People</h3>
          {formation.who.map(person=><div key={person.key} className="mt-2"><p className="text-sm">{person.name}{person.role?' · '+person.role:''}</p><p className="text-xs text-sand-600">{person.linked?'Verified identity':'Identity / participation not verified'}</p></div>)}
        </section>}
        <Details title="Money" terms={formation.money}/>
        <Details title="When" terms={formation.when}/>
        {formation.responsibilities.map(group=><Details key={group.party} title={group.party+' will'} terms={group.duties}/>)}
        <Details title="Conditions" terms={formation.conditions}/>
        <Details title="Not included" terms={formation.notIncluded}/>
      </> : <p className="rounded-xl bg-cream-100 p-3 text-sm">The conversation has started. SecurePay hasn't established any Agreement terms yet.</p>}
      {expanded && formation.openPoints.length>0 && <section className="rounded-xl bg-cream-100 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-sand-600">Still to settle</p>{formation.openPoints.slice(0,5).map(p=><p key={p.id} className="mt-2 text-sm">{p.text}</p>)}</section>}
      
      {expanded && formation.readingSources.length>0 && <p className="text-xs text-sand-600">SecurePay is still reading: {formation.readingSources.join(', ')}</p>}
      {expanded && formation.reviewable && <p className="rounded-xl border border-cream-200 p-3 text-xs">SecurePay can offer a draft for review; that does not certify fair-trade quality, consent or Money readiness. Formal review and acceptance remain in the existing SecurePay journey.</p>}
    </div>}
    <div className="flex items-start gap-2 text-xs text-sand-600"><ShieldCheck size={16} className="shrink-0"/> Chat and My Work read the same conversation. Only the SecurePay backend can establish, review or authorise an Agreement.</div>
  </section>;
}
