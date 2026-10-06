import type { AppView } from '../../types';

type ExperienceArea = 'vision' | 'store' | 'agreement' | 'money';

const AREAS: Array<{ key: ExperienceArea; label: string; purpose: string; view: AppView }> = [
  { key: 'vision', label: 'Vision', purpose: 'Think it through', view: 'vision-board' },
  { key: 'store', label: 'Store', purpose: 'Find what you need', view: 'store' },
  { key: 'agreement', label: 'Agreement', purpose: 'Make it clear', view: 'agreements' },
  { key: 'money', label: 'Money', purpose: 'Fund and move safely', view: 'money' },
];

export function ExperiencePathway({ active, onNavigate, className = '' }: {
  active: ExperienceArea;
  onNavigate?: (view: AppView) => void;
  className?: string;
}) {
  return (
    <section aria-label="SecurePay journey" className={`rounded-2xl border border-cream-200 bg-white p-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-600">Keep the work connected</p>
          <p className="mt-1 text-[0.82rem] text-sand-600">Move between thinking, finding, agreeing and money without losing the context of what you are trying to make happen.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {AREAS.map(area => {
          const isActive = area.key === active;
          const enabled = isActive || Boolean(onNavigate);
          return (
            <button
              key={area.key}
              type="button"
              disabled={!enabled}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => { if (!isActive) onNavigate?.(area.view); }}
              className={`min-h-16 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-forest-400 ${
                isActive
                  ? 'border-forest-300 bg-forest-50 text-forest-800'
                  : enabled
                    ? 'border-cream-200 bg-cream-50/50 text-sand-700 hover:border-forest-300 hover:bg-forest-50/40'
                    : 'border-cream-100 bg-cream-50/30 text-sand-600'
              }`}
            >
              <span className="block text-[0.78rem] font-medium">{area.label}</span>
              <span className="mt-0.5 block text-[0.68rem] leading-snug text-sand-600">{area.purpose}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
