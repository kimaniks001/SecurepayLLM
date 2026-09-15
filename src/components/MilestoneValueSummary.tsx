interface MilestoneValueSummaryProps {
  totalValue: string;
  allocatedValue: string;
  unallocatedValue: string;
}

export function MilestoneValueSummary({ totalValue, allocatedValue, unallocatedValue }: MilestoneValueSummaryProps) {
  const hasMismatch = !unallocatedValue.includes('KES 0');
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Total value integrity</div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Total agreement value</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{totalValue}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Allocated to milestones</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{allocatedValue}</span>
        </div>
        <div className={`flex items-baseline justify-between rounded-lg px-3 py-2 ${hasMismatch ? 'bg-ember-50' : 'bg-cream-50'}`}>
          <span className={`text-[0.78rem] ${hasMismatch ? 'text-ember-700' : 'text-sand-600'}`}>Unallocated</span>
          <span className={`text-[0.875rem] font-medium ${hasMismatch ? 'text-ember-700' : 'text-forest-800'}`}>{unallocatedValue}</span>
        </div>
      </div>
      {hasMismatch && (
        <p className="mt-2 text-[0.72rem] text-ember-600">
          Agreement total differs from milestone allocation. Update agreement total or adjust milestones. Do not infer financial authority.
        </p>
      )}
      <p className="mt-2 text-[0.68rem] text-sand-400">
        This is agreement structure only. Money is managed by authoritative SecurePay Money.
      </p>
    </div>
  );
}
