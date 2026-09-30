import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Lightbulb, RefreshCw } from 'lucide-react';
import { Surface, SurfaceBody } from '../../../components/dna/Surface';
import { Button } from '../../../components/dna/Button';
import { StatusNotice } from '../../../components/dna/StatusNotice';
import type { VisionDreamController } from './controller';

/**
 * A composable Dream-first Vision surface. Mount above the existing Library once Claude's
 * Gate 1 router changes are reconciled. onContinue must reopen the SAME conversation ID.
 */
export function VisionDreamExperience({ controller, onContinue }: {
  controller: VisionDreamController;
  onContinue?: (conversationId: string) => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [thought, setThought] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  useEffect(() => { void controller.load(); }, [controller]);
  useEffect(() => {
    setTitle(state.selected?.title ?? '');
    setNote(state.selected?.content ?? '');
  }, [state.selected]);

  if (state.selected) {
    const selected = state.selected;
    return <section aria-label="Your Dream" className="space-y-4">
      <button type="button" onClick={() => controller.close()}
        className="min-h-11 inline-flex items-center gap-2 text-sm text-forest-700">
        <ArrowLeft className="size-4" /> All Dreams
      </button>
      <Surface><SurfaceBody className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-sand-500">Your thoughts · private</p>
        <label className="block space-y-1 text-sm text-sand-600">
          What shall we call this?
          <input value={title} onChange={e => setTitle(e.target.value)} disabled={selected.locked || selected.superseded}
            maxLength={200} className="block w-full min-h-11 rounded-xl border border-cream-200 p-3 text-forest-800 disabled:opacity-60" />
        </label>
        <label className="block space-y-1 text-sm text-sand-600">
          What you have in mind
          <textarea value={note} onChange={e => setNote(e.target.value)} disabled={selected.locked || selected.superseded}
            maxLength={4000} rows={5} className="block w-full rounded-xl border border-cream-200 p-3 text-forest-800 disabled:opacity-60"/>
        </label>
        <p className="text-xs text-sand-500">This is your editable note, not an agreement or an AI-confirmed fact.</p>
        {state.error && <StatusNotice tone="warning" icon={false}>{state.error}</StatusNotice>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={selected.locked || selected.superseded || state.phase !== 'ready' || !title.trim()}
            onClick={() => void controller.saveSummary(title, note, selected.version)}>Save thoughts</Button>
          <Button variant="secondary" disabled={state.phase === 'loading' || state.phase === 'editing'}
            onClick={() => void controller.load()}>
            <RefreshCw className="size-4" /> Refresh note
          </Button>
          {onContinue && <Button variant="secondary" onClick={() => onContinue(selected.conversationId)}>
            Continue with KS001 <ArrowRight className="size-4" />
          </Button>}
        </div>
        {selected.superseded && <p className="text-sm text-sand-600">A newer Library version exists. This historical note cannot be edited here.</p>}
        {selected.locked && <p className="text-sm text-sand-600">
          This note is locked. Use the existing Vision Library to unlock or supersede it.
        </p>}
      </SurfaceBody></Surface>
    </section>;
  }

  return <section aria-label="Dreams" className="space-y-5">
    <Surface><SurfaceBody className="space-y-4 p-5 md:p-7">
      <div className="flex items-center gap-2 text-forest-700 text-xs uppercase tracking-[0.12em]">
        <Lightbulb className="size-4" /> Vision
      </div>
      <h1 className="font-display text-2xl md:text-3xl text-forest-800">What's on your mind?</h1>
      <p className="text-sand-600 text-sm">A thought, something you saw, a question or an idea. It doesn't have to be a plan.</p>
      <label className="block">
        <span className="sr-only">Start with your thought</span>
        <textarea value={thought} onChange={e => setThought(e.target.value)} rows={4}
          maxLength={4000} placeholder="I've been thinking about..."
          className="block w-full rounded-2xl border border-cream-200 bg-cream-50/50 p-4 text-forest-800 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400" />
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-sand-500">{thought.length} / 4,000</span>
        <Button disabled={!thought.trim() || state.phase === 'loading' || state.phase === 'saving' || state.phase === 'reconciling' || !!state.pending}
          onClick={async () => { const created = await controller.start(thought); if (created) setThought(''); }}>
          {state.phase === 'saving' ? 'Saving…' : 'Start a Dream'} <ArrowRight className="size-4" />
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
          <Button variant="secondary" onClick={() => {
            controller.abandonPending(); setConfirmAbandon(false);
          }}>Yes, leave this draft</Button>
          <Button variant="ghost" onClick={() => setConfirmAbandon(false)}>Keep trying</Button>
        </div>
      </StatusNotice>}
    </SurfaceBody></Surface>

    <div className="space-y-3">
      <h2 className="font-display text-xl text-forest-800">Continue thinking</h2>
      {state.phase === 'loading' && <p role="status" className="text-sm text-sand-600">Finding your Dreams…</p>}
      {state.phase !== 'loading' && state.dreams.length === 0 && <p className="text-sm text-sand-600">Your first Dream can start with a single sentence.</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.dreams.map(dream => <li key={dream.dreamId}>
          <button type="button" className="w-full min-h-20 text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-400 focus-visible:ring-2 focus-visible:ring-forest-400"
            onClick={() => controller.select(dream.dreamId)}>
            <span className="block text-sm font-medium text-forest-800">{dream.title}</span>
            <span className="block text-xs mt-1 text-sand-600 line-clamp-2">{dream.content || 'Continue this thought'}</span>
          </button>
        </li>)}
      </ul>
    </div>
  </section>;
}