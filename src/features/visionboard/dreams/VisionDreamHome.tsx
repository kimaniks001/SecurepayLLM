import { useSyncExternalStore } from 'react';
import { NavBar } from '../../../components/NavBar';
import { Button } from '../../../components/dna/Button';
import { Surface, SurfaceBody } from '../../../components/dna/Surface';
import { StatusNotice } from '../../../components/dna/StatusNotice';
import type { AppView } from '../../../types';
import type { VisionDreamController } from './controller';
import { VisionDreamExperience } from './VisionDreamExperience';

/**
 * Isolated signed-in Vision V1 entry. The existing Vision Library is deliberately
 * reused by its caller: this shell does not invent a second Library or store.
 *
 * The router can mount this once Gate 1 AgentExperience is reconciled. Until then
 * it stays on the draft Vision branch; no shared Home/KS001 route is modified.
 */
export function VisionDreamHome({
  controller, onContinue, onOpenLibrary, onNavigate, handoffError,
}: {
  controller: VisionDreamController;
  /** Resume this exact conversation and prefill, but NEVER auto-send, the person's note. */
  onContinue: (continuation: { conversationId: string; draftText: string }) => void;
  onOpenLibrary: () => void;
  onNavigate: (view: AppView) => void;
  handoffError?: string | null;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return <div className="min-h-dvh bg-cream-100">
    <NavBar view="vision-board" onNavigate={onNavigate} />
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6" data-vision-home>
      {!state.selected && <section className="sp-hero px-5 py-5 md:px-7 md:py-6">
        <div className="sp-kicker">Your private thinking space</div>
        <h1 className="sp-display mt-2 text-3xl md:text-4xl">Think freely. Keep what matters.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-600">Start with one thought, return to a Dream, or open your private Library when you want more structure. Nothing becomes a commitment until you choose.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => document.getElementById('vision-dream-thought')?.focus()}>Add a thought</Button>
          <Button variant="secondary" onClick={onOpenLibrary}>Search & organise</Button>
        </div>
      </section>}
      <VisionDreamExperience controller={controller} onContinue={onContinue} />
      {handoffError && <StatusNotice tone="warning" icon={false}>{handoffError}</StatusNotice>}
      <Surface>
        <SurfaceBody className="space-y-3">
          <h2 className="font-display text-xl text-forest-800">Your Vision Library</h2>
          <p className="text-sm text-sand-600">
            Search saved ideas, plans, references, quotations and established guidance. The Library is still private operating memory, not Agreement authority.
          </p>
          <Button variant="secondary" onClick={onOpenLibrary}>
            Open Library
          </Button>
        </SurfaceBody>
      </Surface>
    </main>
  </div>;
}
