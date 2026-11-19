import { useState } from 'react';
import type { HelpJourney, HumanExamination, HumanHelpGateway, HumanHelpResponse, HumanNeed } from '../../api/securepay/human-help';

const journeys: { value: Exclude<HelpJourney, 'LIVING_AGREEMENT'>; label: string }[] = [
  { value: 'BUY', label: 'Buying' }, { value: 'SELL', label: 'Selling' },
  { value: 'PAY', label: 'Paying' }, { value: 'COLLECT', label: 'Collecting' },
];
const needs: { value: HumanNeed; label: string; detail: string }[] = [
  { value: 'TALK_TO_SOMEONE', label: 'Talk to someone', detail: 'I would feel better speaking with a real person' },
  { value: 'REVIEW_AGREEMENT', label: 'Understand my agreement', detail: 'What did we agree, and what is uncertain?' },
  { value: 'FIELD_FACT_FINDING', label: 'Check something on the ground', detail: 'A delivery, count, measurement or condition' },
  { value: 'LOCAL_KNOWLEDGE', label: 'Get local knowledge', detail: 'I need someone familiar with a place' },
  { value: 'SPECIALIST_ADVICE', label: 'Get specialist advice', detail: 'I need qualified expertise, not a guess' },
  { value: 'REPORT_SAFETY_CONCERN', label: 'Something worries me', detail: 'Raise a concern without a deposit' },
];

export function MiniHumanHelpPanel({ gateway, agreement }: {
  gateway: Pick<HumanHelpGateway, 'triage' | 'examine'>;
  agreement?: { agreementId: string; acceptedVersionId: string } | null;
}) {
  const [journey, setJourney] = useState<Exclude<HelpJourney,'LIVING_AGREEMENT'>>('BUY');
  const [need, setNeed] = useState<HumanNeed | null>(null);
  const [result, setResult] = useState<HumanHelpResponse | null>(null);
  const [examination, setExamination] = useState<HumanExamination | null>(null);
  const [examining, setExamining] = useState(false);
  const [examinationError, setExaminationError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const read = async (next: HumanNeed) => {
    if (loading) return;
    setNeed(next); setResult(null); setExamination(null); setExaminationError(null); setError(null); setSelected(null); setLoading(true);
    try {
      const response = await gateway.triage({
        need: next, journey: agreement ? 'LIVING_AGREEMENT' : journey,
        ...(agreement || {})
      });
      setResult(response);
    } catch {
      setError('SecurePay could not verify help options right now. You can still ask KS001 for guidance.');
    } finally { setLoading(false); }
  };
  const examine = async () => {
    if (!agreement || examining || !result?.agreementVerified) return;
    setExamination(null); setExaminationError(null); setExamining(true);
    try {
      const report = await gateway.examine(agreement.agreementId, agreement.acceptedVersionId);
      // Never display source-specific facts from an unrelated/stale response.
      if (report.agreementId !== agreement.agreementId ||
          report.acceptedVersionId !== agreement.acceptedVersionId)
        throw new Error('Unexpected Agreement context');
      setExamination(report);
    } catch {
      setExaminationError('SecurePay could not verify this Agreement now. Reopen it for the latest version.');
    } finally { setExamining(false); }
  };
  return <section className="rounded-2xl border border-forest-200 bg-white p-4" aria-label="Human Layer — Need a hand?">
    <div className="mb-3">
      <h2 className="font-display text-lg text-forest-800">Need a hand?</h2>
      <p className="mt-1 text-sm text-sand-600">Start with what you need. We won't call something a dispute unless it is one.</p>
    </div>
    {!agreement && <div className="mb-3 flex flex-wrap gap-2" aria-label="Trading journey">
      {journeys.map(item=><button key={item.value} type="button" onClick={()=>{setJourney(item.value);setNeed(null);setResult(null);setExamination(null);setExaminationError(null);setSelected(null);setError(null);}}
        className={'min-h-10 rounded-full border px-3 text-xs font-semibold '+
          (journey===item.value?'border-forest-600 bg-forest-50 text-forest-800':'border-cream-200 text-sand-700')}>
        {item.label}</button>)}
    </div>}
    <div className="grid grid-cols-1 gap-2">
      {needs.map(item=><button key={item.value} disabled={loading} type="button" onClick={()=>void read(item.value)}
        className={'min-h-12 rounded-xl border px-3 py-2.5 text-left disabled:opacity-60 '+
          (need===item.value?'border-forest-500 bg-forest-50':'border-cream-200 bg-white hover:bg-cream-50')}>
        <span className="block text-sm font-semibold text-forest-800">{item.label}</span>
        <span className="block text-xs text-sand-600">{item.detail}</span>
      </button>)}
    </div>
    {loading && <p role="status" className="mt-3 text-sm text-sand-600">Checking what SecurePay can genuinely offer…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-ember-700">{error}</p>}
    {result && <div className="mt-4 rounded-xl bg-cream-50 p-3" aria-live="polite">
      <p className="text-sm font-semibold text-forest-800">
        {result.serviceRoute==='INCLUDED_AGREEMENT_HELP' ? 'Core assistance is included' : 'Human assistance is optional'}
      </p>
      <p className="mt-1 text-xs leading-5 text-sand-700">
        {result.serviceRoute==='INCLUDED_AGREEMENT_HELP'
          ? 'There is no dispute deposit just to raise a concern or examine what was agreed.'
          : 'You can explore the right human help. Any paid service requires a separately accepted scope and price.'}
      </p>
      <p className="mt-3 text-xs font-semibold text-forest-700">What would help next?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {result.answerOptions.map(option => <button key={option} type="button" onClick={()=>setSelected(option)}
          className={'min-h-10 rounded-full border px-3 text-xs font-medium '+
            (selected===option?'border-forest-500 bg-white text-forest-800':'border-cream-200 bg-white text-sand-700')}>{option}</button>)}
      </div>
      {selected && <p role="status" className="mt-3 text-xs text-sand-600">Selected: {selected}. The next conversation or assignment has not been started.</p>}
      {agreement && result.agreementVerified && <div className="mt-4 border-t border-cream-200 pt-4">
        <button type="button" disabled={examining} onClick={()=>void examine()}
          className="min-h-11 w-full rounded-xl border border-forest-300 bg-white px-3 text-sm font-semibold text-forest-800 disabled:opacity-60">
          {examining ? 'Examining verified records…' : 'Examine the real Agreement'}
        </button>
        {examinationError && <p role="alert" className="mt-2 text-xs text-ember-700">{examinationError}</p>}
        {examination && <section aria-label="Verified Agreement examination" className="mt-3 space-y-3 rounded-xl border border-forest-200 bg-white p-3">
          <div>
            <h3 className="text-sm font-semibold text-forest-800">What SecurePay can verify</h3>
            <p className="mt-1 text-xs text-sand-600">{examination.agreementTitle} · {examination.agreementReference}</p>
          </div>
          {examination.verifiedFacts.map(fact=><div key={fact.field} className="flex gap-3 text-xs">
            <span className="min-w-24 font-semibold text-forest-700">{fact.field}</span>
            <span className="min-w-0 break-words text-sand-700">{fact.value}</span>
          </div>)}
          <div className="border-t border-cream-200 pt-3">
            <p className="text-xs font-semibold text-forest-800">What still needs to be heard</p>
            <p className="mt-1 text-xs leading-5 text-sand-700">
              Both parties' accounts are not yet verified here. Evidence has not been examined. A review opening is not proof of a claim.
            </p>
            {examination.participantVisibleReviews.length > 0 && <div className="mt-2 space-y-1">
              {examination.participantVisibleReviews.map(item => <p key={item.reviewCaseId}
                className="text-xs text-sand-700">Review: {item.subject} · {item.status}
                {item.releaseRestricted ? ' · Agreement release restricted' : ''}</p>)}
            </div>}
          </div>
          <p className="text-xs font-semibold text-forest-700">Fair questions</p>
          <ul className="list-inside list-disc space-y-1 text-xs leading-5 text-sand-700">
            {examination.questionsForBothSides.map(q=><li key={q}>{q}</li>)}
          </ul>
          <p className="text-xs font-semibold text-forest-700">Possible next steps, not decisions</p>
          {examination.voluntaryOptions.map(o=><p key={o.label} className="text-xs leading-5 text-sand-700">• {o.label}</p>)}
          <p className="text-[11px] leading-5 text-sand-600">No binding decision, Agreement amendment or Money instruction was made.</p>
        </section>}
      </div>}
      <p className="mt-3 text-[11px] leading-5 text-sand-600">This only identifies the next step. It has not contacted anyone, opened a case, changed an Agreement or authorized Money.</p>
    </div>}
  </section>;
}
