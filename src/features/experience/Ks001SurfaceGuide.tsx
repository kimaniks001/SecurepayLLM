type GuideSurface = 'vision' | 'store' | 'agreement' | 'money';

const COPY: Record<GuideSurface, { title: string; body: string; action: string }> = {
  vision: {
    title: 'SecurePay can help from here',
    body: 'Ask what real SecurePay capabilities could help move this idea forward before you commit.',
    action: 'Ask SecurePay what could help next',
  },
  store: {
    title: 'SecurePay can help you use this, not just browse it',
    body: 'Ask how this Store or fulfilment option could fit your plan or Agreement, and what still needs checking.',
    action: 'Ask SecurePay how this could fit',
  },
  agreement: {
    title: 'SecurePay knows which Agreement you are looking at',
    body: 'Ask what needs attention, what happens next, or what SecurePay can help you understand here.',
    action: 'Ask SecurePay about this Agreement',
  },
  money: {
    title: 'SecurePay can explain this Money state',
    body: 'Ask what the numbers mean or why a payment, funding or release step is or is not available. Financial authority still comes from the Money screen.',
    action: 'Ask SecurePay about this Money state',
  },
};

export function Ks001SurfaceGuide({ surface, onAsk }: {
  surface: GuideSurface;
  onAsk?: () => void;
}) {
  if (!onAsk) return null;
  const copy = COPY[surface];
  return (
    <section aria-label="SecurePay contextual help" className="rounded-2xl border border-forest-200 bg-forest-50/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">SecurePay · Trust Project identity KS001</p>
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
    </section>
  );
}
