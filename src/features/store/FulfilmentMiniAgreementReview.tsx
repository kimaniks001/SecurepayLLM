import type { MiniAgreementReviewDto, SupplyRouteDto } from '../../api/securepay/fulfilment-needs';

export function FulfilmentMiniAgreementReview({ review, route, onBack, onOpenOffer, onContinue }: {
  review: MiniAgreementReviewDto;
  route: SupplyRouteDto;
  onBack: () => void;
  onOpenOffer: () => void;
  onContinue: () => void;
}) {
  return (
    <section aria-labelledby="mini-agreement-review-title" className="rounded-2xl border border-forest-200 bg-white p-5 shadow-card">
      <button type="button" onClick={onBack} className="min-h-11 text-[0.8rem] text-forest-700 underline">← Back to supply routes</button>

      <div className="mt-2">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Before an Agreement</p>
        <h2 id="mini-agreement-review-title" className="mt-1 font-display text-xl text-forest-800">Review what this route would bring forward</h2>
        <p className="mt-1 text-[0.8rem] text-sand-600">
          This is a backend-prepared review only. It has not created an Agreement, reserved anything or moved money.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50/60 p-4">
        <div className="text-[0.68rem] uppercase tracking-wide text-sand-500">What</div>
        <div className="mt-1 text-[0.92rem] font-medium text-forest-800">{review.what}</div>
        <div className="mt-2 text-[0.72rem] text-sand-500">
          Provider: {review.providerDisplayName ?? review.providerKsNumber} · {route.routeLabel}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-cream-200 px-3 py-3">
          <dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Proposed amount</dt>
          <dd className="mt-1 text-[0.84rem] text-forest-800">
            {review.proposedAmountMinor !== null ? `${review.currency} ${(review.proposedAmountMinor / 100).toLocaleString()}` : 'Not established'}
          </dd>
        </div>
        <div className="rounded-xl border border-cream-200 px-3 py-3">
          <dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Needed by</dt>
          <dd className="mt-1 text-[0.84rem] text-forest-800">{review.requiredBy ?? 'Not stated'}</dd>
        </div>
      </dl>

      {review.completionEvidence.length > 0 && (
        <div className="mt-3 rounded-xl border border-cream-200 px-3 py-3">
          <div className="text-[0.68rem] uppercase tracking-wide text-sand-500">Evidence expected</div>
          <ul className="mt-1 space-y-1">
            {review.completionEvidence.map((item, index) => <li key={index} className="text-[0.78rem] text-sand-700">• {item}</li>)}
          </ul>
        </div>
      )}

      {review.missingMaterialDecisions.length > 0 && (
        <div className="mt-3 rounded-xl border border-ember-200 bg-ember-50/60 px-3 py-3">
          <div className="text-[0.72rem] font-medium text-ember-800">Still to decide</div>
          <ul className="mt-1 space-y-1">
            {review.missingMaterialDecisions.map((item, index) => <li key={index} className="text-[0.76rem] text-ember-800">• {item}</li>)}
          </ul>
          <p className="mt-2 text-[0.68rem] text-sand-600">KS001 can help settle these in the normal Agreement-building conversation.</p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50/50 px-3 py-3 text-[0.72rem] text-sand-600">
        Interaction: {review.interactionLevel.replace(/_/g, ' ').toLowerCase()} · Agreement created: no · Money moved: no
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onContinue} className="min-h-11 rounded-full bg-forest-700 px-5 text-[0.84rem] font-medium text-white">
          Continue with KS001
        </button>
        <button type="button" onClick={onOpenOffer} className="min-h-11 rounded-full border border-forest-200 px-5 text-[0.84rem] font-medium text-forest-700">
          Inspect the offer
        </button>
      </div>
      <p className="mt-2 text-[0.7rem] text-sand-500">Continuing carries the selected Store offer into the existing Agreement-building flow. The fulfilment review itself is not an Agreement source, so any missing need details must still appear in the canonical review before you set it up.</p>
    </section>
  );
}
