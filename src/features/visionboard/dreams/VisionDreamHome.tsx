import { NavBar } from '../../../components/NavBar';
import { Button } from '../../../components/dna/Button';
import { Surface, SurfaceBody } from '../../../components/dna/Surface';
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
  controller, onContinue, onOpenLibrary, onNavigate,
}: {
  controller: VisionDreamController;
  /** Resume this exact conversation and prefill, but NEVER auto-send, the person's note. */
  onContinue: (continuation: { conversationId: string; draftText: string }) => void;
  onOpenLibrary: () => void;
  onNavigate: (view: AppView) => void;
}) {
  return <div className="min-h-dvh bg-cream-100">
    <NavBar view="agreements" onNavigate={onNavigate} />
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <VisionDreamExperience controller={controller} onContinue={onContinue} />
      <Surface>
        <SurfaceBody className="space-y-3">
          <h2 className="font-display text-xl text-forest-800">Your Vision Library</h2>
          <p className="text-sm text-sand-600">
            Your existing plans, guidance and templates remain separate from the Dreams
            you are still exploring.
          </p>
          <Button variant="secondary" onClick={onOpenLibrary}>
            Open Vision Library
          </Button>
        </SurfaceBody>
      </Surface>
    </main>
  </div>;
}
