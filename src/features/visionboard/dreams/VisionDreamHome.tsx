import { ArrowLeft, LayoutGrid } from 'lucide-react';
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
  return <div className="min-h-dvh bg-cream-100">
    <NavBar view="vision-board" onNavigate={onNavigate} />
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => onNavigate('signed-in')} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-forest-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Button variant="secondary" onClick={onOpenLibrary} className="min-h-11">
          <LayoutGrid className="h-4 w-4" /> Board
        </Button>
      </div>
      <VisionDreamExperience controller={controller} onContinue={onContinue} />
      {handoffError && <StatusNotice tone="warning" icon={false}>{handoffError}</StatusNotice>}

    </main>
  </div>;
}
