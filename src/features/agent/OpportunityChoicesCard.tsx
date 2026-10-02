import { useState } from 'react';
import type { AgentOpportunityGateway } from '../../api/securepay/agentOpportunity';
import type { OpportunityChoicesComponentView } from '../../api/securepay/agent/adapters';
import { decimalMoney } from '../../decimalMoney';

export function OpportunityChoicesCard({
  component, gateway, live,
}: {
  component: OpportunityChoicesComponentView;
  gateway: AgentOpportunityGateway;
  live: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [agreementLane, setAgreementLane] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharePurpose, setSharePurpose] = useState(true);
  const [shareLocation, setShareLocation] = useState(false);
  const [shareParticipants, setShareParticipants] = useState(false);
  const [communityLive, setCommunityLive] = useState(true);
  const [whatsApp, setWhatsApp] = useState(false);
  const [participantStatement, setParticipantStatement] = useState('');
  const [permissionSaved, setPermissionSaved] = useState(false);

  async function choose(reference: string) {
    if (!live || busy) return;
    setBusy(reference); setError(null);
    try {
      if (component.mode === 'SUPPORT') {
        const handoff = await gateway.selectSupportOffer(component.subjectReference, reference);
        setAgreementLane(handoff.quickContractOpportunityId);
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

  async function grantCommunitySaver() {
    if (busy || permissionSaved) return;
    const sourceKind = component.sourceKind as 'AGREEMENT' | 'QUICK_CONTRACT' | 'COMMUNITY_PROJECT';
    if (!['AGREEMENT', 'QUICK_CONTRACT', 'COMMUNITY_PROJECT'].includes(sourceKind)) {
      setError('SecurePay cannot verify the source for Community Saver consent.');
      return;
    }
    setBusy('consent'); setError(null);
    try {
      await gateway.grantCommunitySaver({
        sourceKind,
        sourceReference: component.subjectReference,
        shareScope: {
          purpose_or_work_summary: sharePurpose,
          location: shareLocation,
          participant_names: shareParticipants,
        },
        consentText: 'I allow only the selected information to be considered for Community Saver participation.',
      });
      setPermissionSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SecurePay could not save Community Saver consent.');
    } finally { setBusy(null); }
  }

  async function grantOutreach() {
    if (busy || permissionSaved) return;
    const channels = [communityLive ? 'COMMUNITY_LIVE' : null, whatsApp ? 'WHATSAPP' : null].filter((v): v is string => !!v);
    if (channels.length === 0) { setError('Choose at least one Outreach channel.'); return; }
    const fields = [sharePurpose ? 'purpose_or_work_summary' : null, shareLocation ? 'location' : null, shareParticipants ? 'participant_names' : null]
      .filter((v): v is string => !!v);
    if (fields.length === 0) { setError('Choose at least one item that may be shared.'); return; }
    setBusy('outreach'); setError(null);
    try {
      const candidate = await gateway.createOutreachCandidate({
        sourceKind: component.sourceKind,
        sourceReference: component.subjectReference,
        purpose: communityLive ? 'COMMUNITY_LIVE' : 'WHATSAPP',
      });
      await gateway.grantOutreachPermission(candidate.candidateId, {
        allowedFields: fields,
        allowedChannels: channels,
        participantStatement: participantStatement.trim() || null,
      });
      setPermissionSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SecurePay could not verify and save Outreach permission.');
    } finally { setBusy(null); }
  }

  if (component.mode === 'COMMUNITY_SAVER' || component.mode === 'OUTREACH') {
    const outreach = component.mode === 'OUTREACH';
    return <section className="rounded-2xl border border-forest-100 bg-white shadow-card overflow-hidden" aria-label={outreach ? 'Outreach sharing permission' : 'Community Saver consent'}>
      <div className="px-4 py-3 border-b border-cream-200">
        <p className="text-[0.7rem] uppercase tracking-wide text-sand-500">{outreach ? 'Outreach permission' : 'Community Saver'}</p>
        <p className="mt-1 text-sm text-forest-800">{component.message}</p>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium text-forest-900">What may be shared?</p>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={sharePurpose} onChange={e => setSharePurpose(e.target.checked)} />Purpose / work summary</label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={shareLocation} onChange={e => setShareLocation(e.target.checked)} />Location</label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={shareParticipants} onChange={e => setShareParticipants(e.target.checked)} />Participant names</label>
        {outreach ? <>
          <p className="pt-2 text-sm font-medium text-forest-900">Where may it be used?</p>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={communityLive} onChange={e => setCommunityLive(e.target.checked)} />Community LIVE</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={whatsApp} onChange={e => setWhatsApp(e.target.checked)} />WhatsApp-ready outreach</label>
          <label className="block text-sm text-sand-700">Optional participant statement
            <textarea value={participantStatement} onChange={e => setParticipantStatement(e.target.value)} rows={3}
              className="mt-1 w-full rounded-xl border border-cream-200 p-3" placeholder="Your own words, if you want them included." />
          </label>
        </> : null}
        {permissionSaved
          ? <p className="rounded-xl bg-forest-50 px-3 py-3 text-sm text-forest-800">{outreach ? 'Permission saved. Outreach may prepare a preview only from the permitted fields and channels.' : 'Community Saver consent saved. Only the selected fields may be considered.'}</p>
          : <button type="button" disabled={!!busy} onClick={() => void (outreach ? grantOutreach() : grantCommunitySaver())}
              className="min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Saving…' : outreach ? 'Allow an Outreach preview' : 'Allow Community Saver consideration'}
            </button>}
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      </div>
      <p className="px-4 py-3 bg-cream-50 text-xs text-sand-500">This permission is separate from Agreement access and from work routing. It does not authorize money movement.</p>
    </section>;
  }

  const money = (minor: number | string | null, currency: string) => {
    if (minor === null || minor === '') return 'Rate on request';
    return decimalMoney(String(minor), currency);
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
    {agreementLane ? <p className="px-4 py-3 text-sm text-forest-700">Support chosen. SecurePay has opened the Quick Contract handoff; the real Agreement is the next authority step.</p> : null}
    {error ? <p className="px-4 py-3 text-sm text-red-700">{error}</p> : null}
    <p className="px-4 py-3 bg-cream-50 text-xs text-sand-500">
      Viewing or choosing here does not move money. Quick Contract work becomes binding only through a real SecurePay Agreement.
    </p>
  </section>;
}
