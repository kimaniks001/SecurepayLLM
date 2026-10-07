import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Lightbulb, RefreshCw } from 'lucide-react';
import { Surface, SurfaceBody } from '../../../components/dna/Surface';
import { Button } from '../../../components/dna/Button';
import { StatusNotice } from '../../../components/dna/StatusNotice';
import { dreamContinuation, MAX_KS001_DRAFT, type VisionDreamController } from './controller';
import { DreamBuilder } from './DreamBuilder';\nimport type { VisionDreamGateway } from '../../../api/securepay/visiondreams';

export function VisionDreamExperience({ controller, onContinue }: {
  controller: VisionDreamController;
  onContinue?: (continuation: ReturnType<typeof dreamContinuation>) => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [thought, setThought] = useState('');
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  useEffect(() => { void controller.load(); }, [controller]);

  if (state.selected) {
    return <DreamBuilder
      key={state.selected.dreamId + ':' + state.selected.version}
      dream={state.selected}
      onBack={() => controller.close()}
      onSaveTitle={(title, content, expectedVersion) => controller.saveSummary(title, content, expectedVersion)}
      onExploreKs001={onContinue ? (draftText) => {
        const clean = draftText.trim();
        if (!clean || clean.length > MAX_KS001_DRAFT) return;
        onContinue(dreamContinuation(state.selected!, clean));
      } : undefined}
    />;
  }

  return <section aria-label="Dreams" className="space-y-5">
    <Surface><SurfaceBody className="space-y-4 p-5 md:p-7">
      <div className="flex items-center gap-2 text-forest-700 text-xs uppercase tracking-[0.12em]">
        <Lightbulb className="size-4" /> Vision
      </div>
      <h1 className="font-display text-2xl md:text-3xl text-forest-800">What are you dreaming of?</h1>
      <p className="text-sand-600 text-sm">Start with a thought, a picture, a sketch or something you have seen. Nothing has to be perfect.</p>
      <p className="text-xs text-sand-500">Private by default. Nothing here becomes a Project, Agreement, Store request or Money instruction unless you deliberately choose a next step.</p>
      <label className="block">
        <span className="sr-only">Start with your thought</span>
        <textarea id="vision-dream-thought" value={thought} onChange={e => setThought(e.target.value)} rows={4}
          maxLength={4000} placeholder="I've been thinking about..."
          className="block w-full rounded-2xl border border-cream-200 bg-cream-50/50 p-4 text-forest-800 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400" />
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-sand-500">{thought.length} / 4,000</span>
        <Button disabled={!thought.trim() || state.phase === 'loading' || state.phase === 'saving' || state.phase === 'reconciling' || !!state.pending}
          onClick={async () => { const created = await controller.start(thought); if (created) setThought(''); }}>
          {state.phase === 'saving' ? 'Saving…' : 'Start building'} <ArrowRight className="size-4" />
        </Button>
      </div>
      {state.error && <StatusNotice tone="warning" icon={false}>{state.error}</StatusNotice>}
      {state.pending && <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={state.phase === 'saving' || state.phase === 'reconciling'}
          onClick={async () => { const saved = await controller.retry(); if (saved) setThought(''); }}>
          <RefreshCw className="size-4" /> Retry saving this Dream
        </Button>
        {state.pending.conversationId && <Button variant="secondary" disabled={state.phase === 'saving' || state.phase === 'reconciling'}
          onClick={async () => { const found = await controller.reconcilePending(); if (found) setThought(''); }}>
          {state.phase === 'reconciling' ? 'Checking…' : 'Check if it saved'}
        </Button>}
        {!state.pending.conversationId
          ? <Button variant="secondary" onClick={() => controller.cancelPending()}>Edit my thought</Button>
          : <Button variant="ghost" onClick={() => setConfirmAbandon(true)}>Leave this draft</Button>}
      </div>}
      {state.pending?.conversationId && confirmAbandon && <StatusNotice tone="warning" icon={false}>
        <p>Leaving gives up this tab's temporary access if the save never completed. It does not delete work on SecurePay.</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button variant="secondary" onClick={() => { controller.abandonPending(); setConfirmAbandon(false); }}>Yes, leave this draft</Button>
          <Button variant="ghost" onClick={() => setConfirmAbandon(false)}>Keep trying</Button>
        </div>
      </StatusNotice>}
    </SurfaceBody></Surface>

    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-forest-800">Continue a Dream</h2>
          <p className="mt-1 text-xs text-sand-500">Open the same private Dream and keep arranging it.</p>
        </div>
      </div>
      {state.phase === 'loading' && <p role="status" className="text-sm text-sand-600">Finding your Dreams…</p>}
      {state.phase !== 'loading' && state.dreams.length === 0 && <p className="text-sm text-sand-600">Your first Dream can start with a single sentence.</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.dreams.map(dream => <li key={dream.dreamId}>
          <button type="button" disabled={!!state.pending || state.phase === 'loading' || state.phase === 'saving' || state.phase === 'reconciling'}
            className="w-full min-h-20 text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-400 focus-visible:ring-2 focus-visible:ring-forest-400 disabled:opacity-50"
            onClick={() => controller.select(dream.dreamId)}>
            <span className="block text-sm font-medium text-forest-800">{dream.title}</span>
            <span className="block text-xs mt-1 text-sand-600 line-clamp-2">Private Dream · open board</span>
          </button>
        </li>)}
      </ul>
    </div>
  </section>;
}
