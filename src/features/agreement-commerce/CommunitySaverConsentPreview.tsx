import { useState } from 'react';
import { COMMERCE_EXPERIENCE, canRevealViewer, canShareCommunitySignal } from './experienceContract';

/**
 * Interactive OWNER REVIEW only. No network calls, persistence, subscription,
 * permission mutation, availability publication or agreement disclosure.
 * Later implementation must use authenticated, audited API consent and vetting.
 */
export function CommunitySaverConsentPreview() {
  const [participates, setParticipates] = useState(false);
  const [needs, setNeeds] = useState(false);
  const [capacity, setCapacity] = useState(false);
  const [areas, setAreas] = useState(false);
  const [agreementSpecific, setAgreementSpecific] = useState(false);
  const [audience, setAudience] = useState<'people'|'community'|'market'>('people');
  const [viewerReceipts, setViewerReceipts] = useState(false);

  // A preview of possible disclosure only; no backend verification is present.
  const mayShareGeneral = canShareCommunitySignal({
    participates, categoryApproved: false, signalSelected: needs || capacity || areas,
    audienceSelected: true, derivedFromPrivateAgreement: false,
  });
  const mayShareAgreement = canShareCommunitySignal({
    participates, categoryApproved: false, signalSelected: agreementSpecific,
    audienceSelected: true, derivedFromPrivateAgreement: true,
    agreementSpecificPermission: false,
  });

  return (
    <details data-community-saver-preview className="rounded-2xl border border-forest-200 bg-white/80">
      <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-forest-800">
        Community Saver · Explore voluntary sharing
      </summary>
      <div className="space-y-3 border-t border-cream-200 p-4">
        <div className="rounded-lg bg-cream-50 px-3 py-2 text-xs text-sand-600" role="status">
          Experience preview only. Nothing is saved, advertised, matched or shared.
          No Store or Community Saver participation is activated here.
        </div>
        <p className="text-sm text-forest-800">{COMMERCE_EXPERIENCE.saver}</p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-forest-800">
          <input type="checkbox" checked={participates} onChange={e => setParticipates(e.target.checked)}
            className="h-4 w-4 accent-forest-700" />
          I would like to participate in Community Saver
        </label>
        {participates && (
          <>
            <p className="text-xs font-semibold text-sand-600">Choose which general business signals you would share</p>
            <label className="flex min-h-10 items-center gap-2 text-sm text-forest-800">
              <input type="checkbox" checked={needs} onChange={e => setNeeds(e.target.checked)} />
              Supplies or services I need
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm text-forest-800">
              <input type="checkbox" checked={capacity} onChange={e => setCapacity(e.target.checked)} />
              Available capacity, when confirmed
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm text-forest-800">
              <input type="checkbox" checked={areas} onChange={e => setAreas(e.target.checked)} />
              Broad service areas or routes (not live location)
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm text-forest-800">
              <input type="checkbox" checked={agreementSpecific} onChange={e => setAgreementSpecific(e.target.checked)} />
              Ask me separately about opportunities arising from my agreements
            </label>
            <label className="block text-xs font-semibold text-forest-800">
              Who would see approved opportunities?
              <select value={audience} onChange={e => setAudience(e.target.value as 'people'|'community'|'market')}
                className="mt-2 min-h-11 w-full rounded-xl border border-forest-200 bg-white px-3 text-sm">
                <option value="people">My People</option>
                <option value="community">My chosen community</option>
                <option value="market">Wider eligible Agreement Market</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-forest-800">
              <input type="checkbox" checked={viewerReceipts} onChange={e => setViewerReceipts(e.target.checked)} />
              Reciprocal viewer visibility
            </label>
            <p className="text-xs text-sand-600">
              {canRevealViewer({myReceipts: viewerReceipts, theirReceipts: viewerReceipts})
                ? 'You could see a viewer only if that person also opts in; they could see your views.'
                : 'Your views would be private; you would not see who viewed your opportunities.'}
            </p>
            <div className="rounded-lg border border-cream-200 bg-cream-50 p-3 text-xs text-sand-600">
              Selected audience: {audience === 'people' ? 'My People' : audience === 'community' ? 'My chosen community' : 'Wider Agreement Market'}.
              This preview has no approved sharing authority. General signals permitted: {mayShareGeneral ? 'yes' : 'no'}.
              Agreement-derived signals permitted: {mayShareAgreement ? 'yes' : 'no'}.
            </div>
          </>
        )}
        <p className="text-xs text-sand-600">
          Private customer identities, prices, agreements and exact locations are not disclosed by joining.
          Transport, storage and accommodation require separate provider vetting.
          Every journey needs fresh capacity confirmation; a reminder is not availability.
        </p>
      </div>
    </details>
  );
}
