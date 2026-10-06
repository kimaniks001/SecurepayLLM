type GuideSurface = 'vision' | 'store' | 'agreement';

const COPY: Record<GuideSurface, { title: string; body: string; action: string }> = {
  vision: {
    title: 'KS001 can help from here',
    body: 'Ask what real SecurePay capabilities could help move this idea forward before you commit.',
    action: 'Ask KS001 what SecurePay can help with here',
  },
  store: {
    title: 'KS001 can help you use this, not just browse it',
    body: 'Ask how this Store or fulfilment option could fit your plan or Agreement, and what still needs checking.',
    action: 'Ask KS001 how this could fit',
  },
  agreement: {
    title: 'KS001 knows which Agreement you are looking at',
    body: 'Ask what needs attention, what SecurePay can help with next, or which real capability may reduce friction.',
    action: 'Ask KS001 what can help next',
  },
};

export function Ks001SurfaceGuide({ surface, onAsk }: {
  surface: GuideSurface;
  onAsk?: () => void;
}) {
  if (!onAsk) return null;
  const copy = COPY[surface];
  return (
    <section aria-label="KS001 contextual help" className="rounded-2xl border border-forest-200 bg-forest-50/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">KS001 · here with you</p>
          <h2 className="mt-1 font-display text-base text-forest-800">{copy.title}</h2>
          <p className="mt-1 text-[0.74rem] text-sand-600">{copy.body}</p>
        </div>
        <button
          type="button"
          onClick={onAsk}
          className="min-h-11 shrink-0 rounded-full bg-forest-700 px-4 text-[0.78rem] font-medium text-white hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
        >
          {copy.action}
        </button>
      </div>
      <p className="mt-2 text-[0.66rem] text-sand-500">KS001 should only suggest capabilities it can verify as real and relevant. Suggestions never create an Agreement, choose a supplier or move money.</p>
    </section>
  );
}
