import { useState } from 'react';
import { practicalQuestions, prepareQuestionForKs001 } from './practicalReadiness';
import type { FormationState } from '../formation/controller';
import type { FormationTerm } from '../formation/view';
import { ArrowRight, CheckCircle2, RefreshCw, ShieldCheck, AlertCircle, Wallet, HelpCircle } from 'lucide-react';

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

export function LiveWorkResultPanel({ state, conversationId, busy, onRefresh, onDiscuss }: {
  state: FormationState | null;
  conversationId: string | null;
  busy: boolean;
  onRefresh: () => void;
  onDiscuss: (question: string) => void;
}) {
  const formation = state?.data?.conversationId === conversationId ? state.data : null;
  const [questionIndex, setQuestionIndex] = useState(0);
  const preparation = practicalQuestions(formation);
  const currentQuestion = preparation.length ? preparation[questionIndex % preparation.length] : null;
  const hasContent = formation && (formation.what.length>0 || formation.who.length>0 || formation.money.length>0 ||
    formation.when.length>0 || formation.responsibilities.some(g=>g.duties.length>0) ||
    formation.conditions.length>0 || formation.notIncluded.length>0);
  return <section aria-label="Live forming Agreement" data-live-formation className="space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs uppercase tracking-wider text-sand-600">My Work · Live Agreement</p>
        <h2 className="mt-2 font-display text-xl">{formation?.summary || 'Your Agreement is taking shape'}</h2></div>
      <button type="button" onClick={onRefresh} disabled={!conversationId||busy||state?.status==='loading'} aria-label="Refresh Agreement from SecurePay" className="min-h-11 rounded-lg border border-cream-200 px-3 disabled:opacity-40"><RefreshCw size={17}/></button>
    </div>
    <p className="text-sm leading-6 text-sand-700">This is SecurePay's actual emerging Agreement for the conversation on the left. Nothing is agreed, signed or payable yet.</p>
    {!conversationId && <div className="rounded-xl bg-cream-100 p-4 text-sm">Tell KS001 what you want to do. The Agreement will start appearing here as SecurePay understands it.</div>}
    {conversationId && busy && <p role="status" className="text-xs text-sand-600">KS001 is updating its understanding…</p>}
    {conversationId && state?.status==='loading' && <p role="status" className="text-xs text-sand-600">Reading the current Agreement from SecurePay…</p>}
    {conversationId && state?.status==='error' && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="flex gap-2 text-sm"><AlertCircle size={17}/> Couldn't refresh the Agreement: {state.error}</p>
      <p className="mt-2 text-xs">The previous version is not confirmed current. Try refreshing; chat messages and Agreement terms are not fabricated.</p>
    </div>}
    {formation && <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-cream-100 px-3 py-1">{formation.stage==='UNDERSTOOD'?'Draft formed · strengthen before review':formation.stage==='BUILD'?'Forming':'Getting started'}</span><span className="text-sand-600">SecurePay version {formation.version}</span></div>
      {formation.money.length > 0 && <section aria-label="Money follows the Agreement" className="rounded-xl border border-cream-200 bg-cream-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Wallet size={17}/> Where will the money follow?</p>
        <p className="mt-2 text-sm leading-6 text-sand-700">The agreed amount is not yet a payment instruction. First clarify who pays, which payee is entitled, and what must happen before money moves.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-lg bg-white px-2 py-2">Payer</span>
          <ArrowRight size={14} aria-hidden="true"/>
          <span className="rounded-lg bg-white px-2 py-2">Agreement conditions</span>
          <ArrowRight size={14} aria-hidden="true"/>
          <span className="rounded-lg bg-white px-2 py-2">Verified payee</span>
        </div>
        <p className="mt-3 text-xs text-sand-600">The person receiving the item is not automatically the person receiving money. SecurePay Money must separately verify the payment destination and authorise funding or release under the Agreement. No payment can be initiated here.</p>
      </section>}
      {currentQuestion && <section aria-label="Strengthen before review" className="rounded-xl border border-cream-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sand-600"><HelpCircle size={16}/> Make this trade work in real life</p>
          {preparation.length > 1 && <span className="shrink-0 text-xs text-sand-600">{questionIndex % preparation.length + 1} of {preparation.length}</span>}
        </div>
        <p className="mt-2 text-sm font-semibold leading-6">{currentQuestion.question}</p>
        <p className="mt-2 text-xs leading-5 text-sand-700">{currentQuestion.reason}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={()=>onDiscuss(prepareQuestionForKs001(currentQuestion.question))} className="min-h-11 rounded-lg bg-forest-800 px-3 text-sm text-white disabled:opacity-50">Work through this with KS001</button>
          {preparation.length > 1 && <button type="button" onClick={()=>setQuestionIndex(i=>i+1)} className="min-h-11 rounded-lg bg-cream-100 px-3 text-sm">Other detail</button>}
        </div>
        <p className="mt-3 text-xs text-sand-600">These are preparation questions, not invented Agreement terms or extra payment requirements. Review availability comes from the backend; financial readiness is separate.</p>
      </section>}
      {state?.changes.length ? <div role="status" className="rounded-xl border border-cream-200 bg-cream-50 p-3"><p className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 size={16}/> Updated with your conversation</p>{state.changes.map(t=><p key={t} className="mt-1 text-xs">{t}</p>)}</div>:null}
      {hasContent ? <>
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
      {formation.openPoints.length>0 && <section className="rounded-xl bg-cream-100 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-sand-600">Still to settle</p>{formation.openPoints.slice(0,5).map(p=><p key={p.id} className="mt-2 text-sm">{p.text}</p>)}</section>}
      {formation.question && <div className="rounded-xl border border-cream-200 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sand-600"><ArrowRight size={16}/> Next question from SecurePay</p><p className="mt-2 text-sm font-medium">{formation.question.text}</p><p className="mt-1 text-xs text-sand-600">Answer KS001 on the left; this panel will update from the same conversation.</p></div>}
      {formation.readingSources.length>0 && <p className="text-xs text-sand-600">SecurePay is still reading: {formation.readingSources.join(', ')}</p>}
      {formation.reviewable && <p className="rounded-xl border border-cream-200 p-3 text-xs">SecurePay has enough to offer draft review, but practical delivery and payment arrangements may still need work. Use KS001 to strengthen them before confirming. Formal review and acceptance remain in the existing SecurePay journey.</p>}
    </div>}
    <div className="flex items-start gap-2 text-xs text-sand-600"><ShieldCheck size={16} className="shrink-0"/> Chat and My Work read the same conversation. Only the SecurePay backend can establish, review or authorise an Agreement.</div>
  </section>;
}
