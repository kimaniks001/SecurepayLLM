interface DisputeAmountSummaryProps {
  totalAgreementValue: string;
  disputedAmount: string;
  notDisputedAmount: string;
}

export function DisputeAmountSummary({ totalAgreementValue, disputedAmount, notDisputedAmount }: DisputeAmountSummaryProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Agreement</div>
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Total agreement value</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{totalAgreementValue}</span>
        </div>
        <div className="flex items-baseline justify-between rounded-lg bg-ember-50 px-3 py-2">
          <span className="text-[0.78rem] text-ember-700 font-medium">Disputed component</span>
          <span className="text-[0.875rem] font-medium text-ember-700">{disputedAmount}</span>
        </div>
        <div className="flex items-baseline justify-between rounded-lg bg-cream-50 px-3 py-2">
          <span className="text-[0.78rem] text-sand-600">Outside this dispute</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{notDisputedAmount}</span>
        </div>
      </div>
      <p className="mt-2 text-[0.72rem] text-sand-400">
        The whole agreement is not automatically disputed. Only the isolated component above is contested.
      </p>
    </div>
  );
}
