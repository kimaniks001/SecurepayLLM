import { useState } from 'react';
import type { AgentOpportunityGateway } from '../../api/securepay/agentOpportunity';
import type { OpportunityChoicesComponentView } from '../../api/securepay/agent/adapters';

export function OpportunityChoicesCard({
  component, gateway, live,
}: {
  component: OpportunityChoicesComponentView;
  gateway: AgentOpportunityGateway;
  live: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(reference: string) {
    if (!live || busy) return;
    setBusy(reference); setError(null);
    try {
      if (component.mode === 'SUPPORT') {
        await gateway.selectSupportOffer(component.subjectReference, reference);
      } else if (component.mode === 'QUICK_CONTRACT') {
        await gateway.selectQuickContractCandidate(component.subjectReference, reference);
      } else {
        return;
      }
      setDone(reference);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SecurePay could not record that choice.');
    } finally {
      setBusy(null);
    }
  }

  const money = (minor: number | string | null, currency: string) => {
    if (minor === null || minor === '') return 'Rate on request';
    const n = Number(minor);
    if (!Number.isFinite(n)) return 'Rate on request';
    return currency + ' ' + (n / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return <section className="rounded-2xl border border-forest-100 bg-white shadow-card overflow-hidden" aria-label="SecurePay choices">
    <div className="px-4 py-3 border-b border-cream-200">
      <p className="text-[0.7rem] uppercase tracking-wide text-sand-500">{component.mode === 'SUPPORT' ? 'Human support' : 'Quick Contract'}</p>
      <p className="mt-1 text-sm text-forest-800">{component.message}</p>
    </div>
    <div className="divide-y divide-cream-200">
      {component.choices.map(choice => {
        const quickReady = component.mode !== 'QUICK_CONTRACT' || choice.status === 'ACCEPTED';
        const disabled = !live || !!busy || !!done || !quickReady;
        return <div key={choice.reference} className="p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-medium text-forest-900 truncate">{choice.displayName}</div>
            <div className="mt-1 text-xs text-sand-600">{choice.role}{choice.capability ? ' · ' + choice.capability : ''}</div>
            <div className="mt-1 text-xs text-sand-600">{choice.availability || 'Availability confirmed by SecurePay'}</div>
            <div className="mt-2 text-sm font-medium text-forest-800">{money(choice.rateMinor, choice.currency)}</div>
            {component.mode === 'QUICK_CONTRACT' && choice.status !== 'ACCEPTED'
              ? <div className="mt-1 text-xs text-sand-500">Waiting for this participant to accept or pass.</div>
              : null}
          </div>
          {done === choice.reference
            ? <span className="text-xs font-medium text-forest-700">Chosen</span>
            : <button type="button" disabled={disabled} onClick={() => void choose(choice.reference)}
                className="min-h-11 shrink-0 rounded-full border border-forest-200 px-4 text-sm font-medium text-forest-800 disabled:opacity-45">
                {busy === choice.reference ? 'Saving…' : component.mode === 'SUPPORT' ? 'Choose' : 'Select'}
              </button>}
        </div>;
      })}
      {component.choices.length === 0 ? <p className="p-4 text-sm text-sand-600">No suitable available choices are published right now.</p> : null}
    </div>
    {error ? <p className="px-4 py-3 text-sm text-red-700">{error}</p> : null}
    <p className="px-4 py-3 bg-cream-50 text-xs text-sand-500">
      Viewing or choosing here does not move money. Quick Contract work becomes binding only through a real SecurePay Agreement.
    </p>
  </section>;
}
