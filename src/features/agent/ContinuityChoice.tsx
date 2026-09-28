/**
 * Entry Perfection Phase 9 (UR-267) -- after signing in, a conversation started anonymously in THIS tab is not silently taken
 * over by whoever signed in. The person chooses: continue with it (it is saved to their account, exactly once, with the tab's
 * possession proof), or start fresh (this tab forgets the anonymous conversation; nothing is attached to their account).
 */
export function ContinuityChoice({ busy, onContinue, onStartFresh }: { busy: boolean; onContinue: () => void; onStartFresh: () => void }) {
  return <section aria-labelledby="continuity-choice-title" className="rounded-2xl border border-cream-200 bg-white/90 px-4 py-3 shadow-soft">
    <h2 id="continuity-choice-title" className="text-[0.95rem] text-forest-800">Continue with the agreement you started in this tab?</h2>
    <p className="mt-1 text-[0.82rem] text-sand-600">It was started before you signed in. Continuing saves it to your account.</p>
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={onContinue}
        className="inline-flex min-h-11 items-center rounded-full bg-forest-700 px-4 text-[0.85rem] text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
        {busy ? 'Saving…' : 'Continue with it'}
      </button>
      <button type="button" disabled={busy} onClick={onStartFresh}
        className="inline-flex min-h-11 items-center rounded-full border border-cream-300 px-4 text-[0.85rem] text-sand-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
        Start fresh
      </button>
    </div>
  </section>;
}
